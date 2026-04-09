import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClickSignDocument {
  key: string;
  status: 'running' | 'closed' | 'canceled' | 'approved';
  filename: string;
  deadline_at: string | null;
  signers: ClickSignSigner[];
}

export interface ClickSignSigner {
  key: string;
  email: string;
  name: string;
  sign_as: string;
  signed_at: string | null;
  status: 'pending' | 'signed';
  request_signature_key?: string;
}

async function callProxy(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('clicksign-proxy', {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  return data;
}

export function useClickSign() {
  const [loading, setLoading] = useState(false);

  /**
   * Envia um PDF (base64) para o ClickSign e cria o documento.
   * Retorna a chave (document_key) do documento criado.
   */
  const createDocument = async (params: {
    contractNumber: string;
    pdfBase64: string;
    deadlineAt?: string;
  }): Promise<string | null> => {
    setLoading(true);
    try {
      const path = `/Vitrio/Contratos/${params.contractNumber}.pdf`;
      const res = await callProxy('create_document', {
        path,
        content_base64: params.pdfBase64,
        deadline_at: params.deadlineAt,
        auto_close: false,
      });
      const key = res?.document?.key;
      if (!key) throw new Error('Documento não criado: chave ausente');
      return key;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erro ao criar documento no ClickSign');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cria um signatário e o vincula ao documento.
   * Retorna o signer_key.
   */
  const addSigner = async (params: {
    documentKey: string;
    name: string;
    email: string;
    cpf?: string;
    phone?: string;
    signAs?: string;
    authMethod?: 'email' | 'sms' | 'whatsapp';
  }): Promise<string | null> => {
    setLoading(true);
    try {
      // 1. Criar signatário
      const signerRes = await callProxy('add_signer', {
        name: params.name,
        email: params.email,
        cpf: params.cpf,
        phone_number: params.phone,
        auth: params.authMethod || 'email',
      });
      const signerKey = signerRes?.signer?.key;
      if (!signerKey) throw new Error('Signatário não criado');

      // 2. Vincular ao documento
      await callProxy('add_signer_to_document', {
        document_key: params.documentKey,
        signer_key: signerKey,
        sign_as: params.signAs || 'sign',
      });

      return signerKey;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erro ao adicionar signatário');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fecha o documento para assinatura (envia e-mails para signatários).
   */
  const closeDocument = async (documentKey: string): Promise<boolean> => {
    setLoading(true);
    try {
      await callProxy('close_document', { document_key: documentKey });
      toast.success('Documento enviado para assinatura!');
      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erro ao fechar documento');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Busca o status atual do documento.
   */
  const getDocument = async (documentKey: string): Promise<ClickSignDocument | null> => {
    setLoading(true);
    try {
      const res = await callProxy('get_document', { document_key: documentKey });
      return res?.document || null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela o documento.
   */
  const cancelDocument = async (documentKey: string): Promise<boolean> => {
    setLoading(true);
    try {
      await callProxy('cancel_document', { document_key: documentKey });
      toast.success('Documento cancelado');
      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erro ao cancelar documento');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createDocument,
    addSigner,
    closeDocument,
    getDocument,
    cancelDocument,
  };
}
