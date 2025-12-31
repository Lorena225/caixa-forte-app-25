import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  X, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  parseExcelFile, 
  mapColumnsToFields, 
  validateAndNormalizeRows,
  type ParsedExcelData,
} from '@/lib/excel/excelParser';
import { exportErrorReport } from '@/lib/excel/exporter';
import { generateRowHash } from '@/lib/excel/normalizers';
import type { ImportTemplate, NormalizedRow, ImportEntityType } from '@/lib/excel/types';

type WizardStep = 'upload' | 'preview' | 'validation' | 'rules' | 'confirm' | 'result';

const ENTITY_LABELS: Record<ImportEntityType, string> = {
  accounts: 'Plano de Contas',
  counterparties: 'Clientes/Fornecedores',
  wallets: 'Carteiras',
  cost_centers: 'Centros de Custo',
  transactions_ar: 'Contas a Receber',
  transactions_ap: 'Contas a Pagar',
  transactions: 'Lançamentos',
  budgets: 'Metas/Orçamento',
};

export default function ImportWizard() {
  const { entity } = useParams<{ entity: string }>();
  const navigate = useNavigate();
  const { currentCompany } = useAuth();

  const [step, setStep] = useState<WizardStep>('upload');
  const [template, setTemplate] = useState<ImportTemplate | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [normalizedRows, setNormalizedRows] = useState<NormalizedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importRules, setImportRules] = useState({
    createNew: true,
    updateExisting: true,
    skipDuplicates: true,
    useExternalKey: true,
  });
  const [result, setResult] = useState<{
    imported: number;
    updated: number;
    duplicates: number;
    errors: number;
    skipped: number;
    batchId?: string;
  } | null>(null);

  // Fetch template
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!entity) return;

      const { data, error } = await supabase
        .from('import_templates')
        .select('*')
        .eq('entity', entity as ImportEntityType)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching template:', error);
        toast.error('Template não encontrado');
        navigate('/importar-exportar');
        return;
      }

      setTemplate({
        ...data,
        columns_json: data.columns_json as unknown as ImportTemplate['columns_json'],
        sample_data_json: data.sample_data_json as ImportTemplate['sample_data_json'],
        instructions_json: data.instructions_json as ImportTemplate['instructions_json'],
      });
    };

    fetchTemplate();
  }, [entity, navigate]);

  // Handle file upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Formato de arquivo inválido. Use Excel (.xlsx, .xls) ou CSV.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await parseExcelFile(selectedFile);
      setParsedData(data);

      if (template) {
        const mapping = mapColumnsToFields(data.headers, template.columns_json);
        setColumnMapping(mapping);
      }

      setStep('preview');
      toast.success(`${data.rows.length} linhas encontradas`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Erro ao ler arquivo');
    } finally {
      setIsProcessing(false);
    }
  }, [template]);

  // Validate and normalize
  const handleValidate = useCallback(() => {
    if (!parsedData || !template) return;

    setIsProcessing(true);

    try {
      const normalized = validateAndNormalizeRows(
        parsedData.rows,
        template.columns_json,
        columnMapping
      );
      setNormalizedRows(normalized);
      setStep('validation');

      const validCount = normalized.filter(r => r.isValid).length;
      const errorCount = normalized.filter(r => !r.isValid).length;

      if (errorCount > 0) {
        toast.warning(`${validCount} linhas válidas, ${errorCount} com erros`);
      } else {
        toast.success(`Todas as ${validCount} linhas estão válidas`);
      }
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Erro ao validar dados');
    } finally {
      setIsProcessing(false);
    }
  }, [parsedData, template, columnMapping]);

  // Process import
  const handleImport = useCallback(async () => {
    if (!currentCompany || !template || !entity) {
      toast.error('Dados incompletos para importação');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create import batch
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          company_id: currentCompany.id,
          integration_id: currentCompany.id, // Using company_id as placeholder
          entity: entity as ImportEntityType as never,
          source_type: 'manual_upload',
          source_filename: file?.name,
          status: 'processing',
          total_rows: normalizedRows.length,
          processed_rows: 0,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // 2. Process each row
      const results = {
        imported: 0,
        updated: 0,
        duplicates: 0,
        errors: 0,
        skipped: 0,
      };

      const validRows = normalizedRows.filter(r => r.isValid);
      const errorRows = normalizedRows.filter(r => !r.isValid);
      results.errors = errorRows.length;

      // Check for external keys or generate hashes
      const keyField = 'external_key';
      const hashFields = getHashFieldsForEntity(entity as ImportEntityType);

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const externalKey = row.data[keyField] as string || 
          generateRowHash(row.data, hashFields);

        // Check if key exists
        const { data: existingKey } = await supabase
          .from('external_keys')
          .select('record_id')
          .eq('company_id', currentCompany.id)
          .eq('entity', entity)
          .eq('external_key', externalKey)
          .single();

        if (existingKey) {
          if (importRules.updateExisting) {
            // Update existing record
            const updated = await updateRecord(entity as ImportEntityType, existingKey.record_id, row.data, currentCompany.id);
            if (updated) {
              results.updated++;
            } else {
              results.errors++;
            }
          } else if (importRules.skipDuplicates) {
            results.duplicates++;
          }
        } else if (importRules.createNew) {
          // Create new record
          const recordId = await createRecord(entity as ImportEntityType, row.data, currentCompany.id);
          if (recordId) {
            results.imported++;
            
            // Save external key
            await supabase.from('external_keys').insert({
              company_id: currentCompany.id,
              entity: entity as ImportEntityType,
              external_key: externalKey,
              record_id: recordId,
              source: 'excel',
            });
          } else {
            results.errors++;
          }
        } else {
          results.skipped++;
        }

        // Save import row
        await supabase.from('import_rows').insert([{
          batch_id: batch.id,
          company_id: currentCompany.id,
          row_number: i + 1,
          raw_json: parsedData?.rows[i] || {},
          normalized_json: row.data as never,
          status: row.isValid ? 'imported' as const : 'error' as const,
          errors_json: row.errors.map(e => e.message) as never,
        }]);
      }

      // Save error rows
      for (let i = 0; i < errorRows.length; i++) {
        const row = errorRows[i];
        await supabase.from('import_rows').insert([{
          batch_id: batch.id,
          company_id: currentCompany.id,
          row_number: validRows.length + i + 1,
          raw_json: parsedData?.rows[validRows.length + i] || {},
          normalized_json: row.data as never,
          status: 'error' as const,
          errors_json: row.errors.map(e => e.message) as never,
        }]);
      }

      // Update batch status
      await supabase.from('import_batches').update({
        status: results.errors > 0 ? 'partial' : 'success',
        finished_at: new Date().toISOString(),
        processed_rows: normalizedRows.length,
        summary_json: results,
      }).eq('id', batch.id);

      setResult({ ...results, batchId: batch.id });
      setStep('result');
      toast.success('Importação concluída!');
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Erro durante importação');
    } finally {
      setIsProcessing(false);
    }
  }, [currentCompany, template, entity, file, normalizedRows, parsedData, importRules]);

  // Download error report
  const handleDownloadErrors = () => {
    const errorRows = normalizedRows
      .map((row, index) => ({
        row_number: index + 1,
        errors: row.errors.map(e => e.message),
        raw_data: parsedData?.rows[index] || {},
      }))
      .filter(r => r.errors.length > 0);

    if (errorRows.length === 0) {
      toast.info('Nenhum erro para exportar');
      return;
    }

    exportErrorReport(errorRows, `importacao_${entity}`);
    toast.success('Relatório de erros baixado');
  };

  const progressPercent = {
    upload: 0,
    preview: 20,
    validation: 40,
    rules: 60,
    confirm: 80,
    result: 100,
  }[step];

  if (!template) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/importar-exportar')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Importar {ENTITY_LABELS[entity as ImportEntityType] || entity}
            </h1>
            <p className="text-muted-foreground">
              Wizard de importação via Excel/CSV
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={step === 'upload' ? 'font-medium text-primary' : ''}>Upload</span>
            <span className={step === 'preview' ? 'font-medium text-primary' : ''}>Preview</span>
            <span className={step === 'validation' ? 'font-medium text-primary' : ''}>Validação</span>
            <span className={step === 'rules' ? 'font-medium text-primary' : ''}>Regras</span>
            <span className={step === 'confirm' ? 'font-medium text-primary' : ''}>Confirmar</span>
            <span className={step === 'result' ? 'font-medium text-primary' : ''}>Resultado</span>
          </div>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>1. Upload do Arquivo</CardTitle>
              <CardDescription>
                Selecione um arquivo Excel (.xlsx) ou CSV com os dados para importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isProcessing ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground mb-3 animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  )}
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Clique para selecionar</span> ou arraste o arquivo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Excel (.xlsx, .xls) ou CSV
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
              </label>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>
                  Não tem o modelo? <Button variant="link" className="h-auto p-0" onClick={() => navigate('/importar-exportar')}>
                    Baixe aqui
                  </Button>
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Preview */}
        {step === 'preview' && parsedData && (
          <Card>
            <CardHeader>
              <CardTitle>2. Preview dos Dados</CardTitle>
              <CardDescription>
                {parsedData.rows.length} linhas encontradas. Verifique se os dados estão corretos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto max-h-96 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium">#</th>
                      {parsedData.headers.slice(0, 8).map((header, i) => (
                        <th key={i} className="py-2 px-3 text-left font-medium">
                          {header}
                          {columnMapping[header] && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                              {columnMapping[header]}
                            </Badge>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        {parsedData.headers.slice(0, 8).map((header, j) => (
                          <td key={j} className="py-2 px-3 max-w-[200px] truncate">
                            {String(row[header] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedData.rows.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  Mostrando 50 de {parsedData.rows.length} linhas
                </p>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); setParsedData(null); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleValidate} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Validar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Validation */}
        {step === 'validation' && (
          <Card>
            <CardHeader>
              <CardTitle>3. Validação</CardTitle>
              <CardDescription>
                Resultado da validação dos dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{normalizedRows.filter(r => r.isValid).length}</p>
                        <p className="text-sm text-muted-foreground">Linhas válidas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <X className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{normalizedRows.filter(r => !r.isValid).length}</p>
                        <p className="text-sm text-muted-foreground">Linhas com erro</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{normalizedRows.length}</p>
                        <p className="text-sm text-muted-foreground">Total de linhas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {normalizedRows.some(r => !r.isValid) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Linhas com Erros
                    </h4>
                    <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Erros
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="py-2 px-3 text-left font-medium">Linha</th>
                          <th className="py-2 px-3 text-left font-medium">Erros</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalizedRows.map((row, i) => (
                          !row.isValid && (
                            <tr key={i} className="border-b">
                              <td className="py-2 px-3">{i + 1}</td>
                              <td className="py-2 px-3">
                                <ul className="list-disc pl-4 text-red-600">
                                  {row.errors.map((err, j) => (
                                    <li key={j}>{err.message}</li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('preview')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={() => setStep('rules')} disabled={normalizedRows.filter(r => r.isValid).length === 0}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Configurar Regras
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Rules */}
        {step === 'rules' && (
          <Card>
            <CardHeader>
              <CardTitle>4. Regras de Importação</CardTitle>
              <CardDescription>
                Configure como os dados devem ser tratados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="createNew"
                    checked={importRules.createNew}
                    onCheckedChange={(checked) => setImportRules(prev => ({ ...prev, createNew: !!checked }))}
                  />
                  <label htmlFor="createNew" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Criar novos registros
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="updateExisting"
                    checked={importRules.updateExisting}
                    onCheckedChange={(checked) => setImportRules(prev => ({ ...prev, updateExisting: !!checked }))}
                  />
                  <label htmlFor="updateExisting" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Atualizar registros existentes (se chave externa coincidir)
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="skipDuplicates"
                    checked={importRules.skipDuplicates}
                    onCheckedChange={(checked) => setImportRules(prev => ({ ...prev, skipDuplicates: !!checked }))}
                  />
                  <label htmlFor="skipDuplicates" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Ignorar duplicados
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="useExternalKey"
                    checked={importRules.useExternalKey}
                    onCheckedChange={(checked) => setImportRules(prev => ({ ...prev, useExternalKey: !!checked }))}
                  />
                  <label htmlFor="useExternalKey" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Usar chave externa para idempotência (ou gerar hash)
                  </label>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('validation')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={() => setStep('confirm')}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <Card>
            <CardHeader>
              <CardTitle>5. Confirmar Importação</CardTitle>
              <CardDescription>
                Revise as informações antes de processar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arquivo:</span>
                  <span className="font-medium">{file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entidade:</span>
                  <span className="font-medium">{ENTITY_LABELS[entity as ImportEntityType]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linhas válidas:</span>
                  <span className="font-medium text-green-600">{normalizedRows.filter(r => r.isValid).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linhas com erro:</span>
                  <span className="font-medium text-red-600">{normalizedRows.filter(r => !r.isValid).length}</span>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Esta ação irá criar/atualizar registros no sistema. 
                  Certifique-se de que os dados estão corretos.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('rules')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirmar Importação
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <Card>
            <CardHeader>
              <CardTitle>6. Resultado da Importação</CardTitle>
              <CardDescription>
                Importação concluída com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-5">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                    <p className="text-sm text-muted-foreground">Criados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                    <p className="text-sm text-muted-foreground">Atualizados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{result.duplicates}</p>
                    <p className="text-sm text-muted-foreground">Duplicados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                    <p className="text-sm text-muted-foreground">Erros</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
                    <p className="text-sm text-muted-foreground">Ignorados</p>
                  </CardContent>
                </Card>
              </div>

              {result.errors > 0 && (
                <Button variant="outline" onClick={handleDownloadErrors}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Relatório de Erros
                </Button>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => navigate('/importar-exportar')}>
                  Voltar para Importar/Exportar
                </Button>
                <Button onClick={() => navigate('/importar-exportar/historico')}>
                  Ver Histórico
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

// Helper functions for entity-specific operations
function getHashFieldsForEntity(entity: ImportEntityType): string[] {
  const hashFields: Record<ImportEntityType, string[]> = {
    accounts: ['code', 'name'],
    counterparties: ['name', 'document'],
    wallets: ['name', 'type'],
    cost_centers: ['code', 'name'],
    transactions_ar: ['transaction_date', 'due_date', 'original_amount', 'description', 'wallet_name'],
    transactions_ap: ['transaction_date', 'due_date', 'original_amount', 'description', 'wallet_name'],
    transactions: ['direction', 'transaction_date', 'original_amount', 'description', 'wallet_name'],
    budgets: ['year', 'month'],
  };
  return hashFields[entity] || ['name'];
}

async function createRecord(
  entity: ImportEntityType, 
  data: Record<string, unknown>,
  companyId: string
): Promise<string | null> {
  try {
    const tableName = getTableName(entity);
    const insertData = await prepareInsertData(entity, data, companyId);

    const { data: result, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error(`Error creating ${entity}:`, error);
      return null;
    }

    return result.id;
  } catch (error) {
    console.error(`Error creating ${entity}:`, error);
    return null;
  }
}

async function updateRecord(
  entity: ImportEntityType,
  recordId: string,
  data: Record<string, unknown>,
  companyId: string
): Promise<boolean> {
  try {
    const tableName = getTableName(entity);
    const updateData = await prepareInsertData(entity, data, companyId);
    delete (updateData as Record<string, unknown>).id;

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', recordId);

    if (error) {
      console.error(`Error updating ${entity}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error updating ${entity}:`, error);
    return false;
  }
}

function getTableName(entity: ImportEntityType): string {
  const tables: Record<ImportEntityType, string> = {
    accounts: 'accounts',
    counterparties: 'counterparties',
    wallets: 'wallets',
    cost_centers: 'cost_centers',
    transactions_ar: 'transactions',
    transactions_ap: 'transactions',
    transactions: 'transactions',
    budgets: 'budgets',
  };
  return tables[entity];
}

async function prepareInsertData(
  entity: ImportEntityType,
  data: Record<string, unknown>,
  companyId: string
): Promise<Record<string, unknown>> {
  const base = { company_id: companyId };

  switch (entity) {
    case 'accounts':
      return {
        ...base,
        code: data.code,
        name: data.name,
        category_type: data.category_type,
        is_managerial: data.is_managerial ?? false,
        is_active: data.is_active ?? true,
      };

    case 'counterparties':
      return {
        ...base,
        name: data.name,
        type: data.type || 'ambos',
        document: data.document,
        email: data.email,
        phone: data.phone,
        address: data.address,
        is_active: data.is_active ?? true,
      };

    case 'wallets':
      return {
        ...base,
        name: data.name,
        type: data.type || 'banco',
        opening_balance: data.opening_balance || 0,
        closing_day: data.closing_day,
        due_day: data.due_day,
        is_active: true,
      };

    case 'cost_centers':
      return {
        ...base,
        code: data.code,
        name: data.name,
        is_active: data.is_active ?? true,
      };

    case 'transactions_ar':
    case 'transactions_ap':
    case 'transactions': {
      const direction = entity === 'transactions_ar' ? 'entrada' : 
                       entity === 'transactions_ap' ? 'saida' : 
                       data.direction;

      // Lookup wallet
      const walletId = await lookupWallet(companyId, data.wallet_name as string);
      const accountId = await lookupAccount(companyId, data.account_code as string, data.account_name as string);

      const originalAmount = Number(data.original_amount) || 0;
      const discountPercent = Number(data.discount_percent) || 0;
      const interestAmount = Number(data.interest_amount) || 0;
      const discountAmount = originalAmount * (discountPercent / 100);
      const totalAmount = originalAmount - discountAmount + interestAmount;

      const status = data.paid_date ? 'pago' : 'lancado';

      return {
        ...base,
        direction,
        transaction_date: data.transaction_date,
        due_date: data.due_date || data.transaction_date,
        paid_date: data.paid_date,
        description: data.description,
        original_amount: originalAmount,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        interest_amount: interestAmount,
        total_amount: totalAmount,
        status,
        wallet_id: walletId,
        account_id: accountId,
        notes: data.notes,
      };
    }

    case 'budgets':
      return {
        ...base,
        year: data.year,
        month: data.month,
        target_revenue: data.target_revenue || 0,
        target_expense: data.target_expense || 0,
        target_profit: data.target_profit || 0,
        target_margin: data.target_margin || 0,
      };

    default:
      return base;
  }
}

async function lookupWallet(companyId: string, walletName: string): Promise<string | null> {
  if (!walletName) return null;

  const { data } = await supabase
    .from('wallets')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', `%${walletName}%`)
    .limit(1)
    .single();

  return data?.id || null;
}

async function lookupAccount(companyId: string, code?: string, name?: string): Promise<string | null> {
  if (!code && !name) return null;

  let query = supabase.from('accounts').select('id').eq('company_id', companyId);

  if (code) {
    query = query.eq('code', code);
  } else if (name) {
    query = query.ilike('name', `%${name}%`);
  }

  const { data } = await query.limit(1).single();
  return data?.id || null;
}
