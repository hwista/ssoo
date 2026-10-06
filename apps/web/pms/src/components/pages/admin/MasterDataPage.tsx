'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Database,
  Download,
  Factory,
  FileSpreadsheet,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ServerCog,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SsooSearchInput } from '@ssoo/web-shell';
import { LoadingState, ErrorState } from '@/components/common/StateDisplay';
import {
  useCreatePmsMasterImportProfile,
  useCreatePlantSite,
  useCreateSystemCatalog,
  useCreateSystemInstance,
  useCreateSystemIntegration,
  useDeactivatePmsMasterImportProfile,
  useDeactivatePlantSite,
  useDeactivateSystemCatalog,
  useDeactivateSystemInstance,
  useDeactivateSystemIntegration,
  useImportPmsMaster,
  usePmsMasterImportProfileHistory,
  usePmsMasterImportProfiles,
  usePlantSites,
  usePmsMasterSummary,
  useRestorePmsMasterImportProfile,
  useSystemCatalogs,
  useSystemInstances,
  useSystemIntegrations,
  useUpdatePmsMasterImportProfile,
  useUpdatePlantSite,
  useUpdateSystemCatalog,
  useUpdateSystemInstance,
  useUpdateSystemIntegration,
} from '@/hooks/queries/usePmsMaster';
import { useCustomerList } from '@/hooks/queries/useCustomers';
import type {
  CreatePlantSiteRequest,
  CreateSystemCatalogRequest,
  CreateSystemInstanceRequest,
  CreateSystemIntegrationRequest,
  ImportPmsMasterRequest,
  UpdatePlantSiteRequest,
  UpdateSystemCatalogRequest,
  UpdateSystemInstanceRequest,
  UpdateSystemIntegrationRequest,
} from '@/lib/api/endpoints/master';
import { formatPmsShortDateTime } from '@/lib/pms-format';
import { formatCustomerLookupCaption } from '@/lib/project-display';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useConfirmStore } from '@/stores/confirm.store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import type {
  PlantSite,
  PmsMasterImportProfile,
  PmsMasterImportProfileHistory,
  PmsMasterImportResponse,
  SystemCatalog,
  SystemInstance,
  SystemIntegration,
} from '@ssoo/types/pms';

type MasterTab = 'sites' | 'catalogs' | 'instances' | 'integrations';
type FormMode = 'create' | 'edit';
type ImportSourceMode = 'json' | 'file';
type ImportEntityKey = 'sites' | 'systemCatalogs' | 'systemInstances' | 'integrations';

interface ImportFieldConfig {
  field: string;
  label: string;
  required?: boolean;
  legacy?: boolean;
  aliases: string[];
}

interface ImportCsvRow {
  [column: string]: string;
}

interface ParsedImportFile {
  fileName: string;
  headers: string[];
  rows: ImportCsvRow[];
}

type ImportColumnMapping = Record<string, string>;

interface MasterTabConfig {
  key: MasterTab;
  label: string;
  icon: typeof Factory;
  countKey: 'sites' | 'systemCatalogs' | 'systemInstances' | 'integrations';
}

interface MasterFormData {
  code: string;
  name: string;
  customerId: string;
  siteId: string;
  systemCatalogId: string;
  parentSystemCatalogId: string;
  sourceSystemInstanceId: string;
  targetSystemInstanceId: string;
  siteTypeCode: string;
  regionCode: string;
  address: string;
  timezone: string;
  categoryCode: string;
  vendorName: string;
  environmentCode: string;
  operationOwnerTypeCode: string;
  operationOwnerName: string;
  lifecycleStatusCode: string;
  directionCode: string;
  interfaceTypeCode: string;
  statusCode: string;
  description: string;
  memo: string;
}

interface SelectOption {
  value: string;
  label: string;
  caption?: string | null;
}

const MASTER_TABS: MasterTabConfig[] = [
  { key: 'sites', label: '플랜트/사이트', icon: Factory, countKey: 'sites' },
  { key: 'catalogs', label: '시스템 종류', icon: Database, countKey: 'systemCatalogs' },
  { key: 'instances', label: '시스템 인스턴스', icon: ServerCog, countKey: 'systemInstances' },
  { key: 'integrations', label: '인터페이스', icon: Network, countKey: 'integrations' },
];

const INITIAL_FORM: MasterFormData = {
  code: '',
  name: '',
  customerId: '',
  siteId: '',
  systemCatalogId: '',
  parentSystemCatalogId: '',
  sourceSystemInstanceId: '',
  targetSystemInstanceId: '',
  siteTypeCode: '',
  regionCode: '',
  address: '',
  timezone: '',
  categoryCode: '',
  vendorName: '',
  environmentCode: '',
  operationOwnerTypeCode: '',
  operationOwnerName: '',
  lifecycleStatusCode: '',
  directionCode: '',
  interfaceTypeCode: '',
  statusCode: '',
  description: '',
  memo: '',
};

const NONE_VALUE = '__none__';
const IMPORT_MAPPING_STORAGE_KEY = 'ssoo:pms:master-import-mappings:v1';
const IMPORT_ENTITY_OPTIONS: Array<{ key: ImportEntityKey; label: string }> = [
  { key: 'sites', label: '플랜트/사이트' },
  { key: 'systemCatalogs', label: '시스템 종류' },
  { key: 'systemInstances', label: '시스템 인스턴스' },
  { key: 'integrations', label: '인터페이스' },
];

const IMPORT_FIELD_CONFIGS: Record<ImportEntityKey, ImportFieldConfig[]> = {
  sites: [
    { field: 'siteCode', label: '사이트 코드', required: true, aliases: ['siteCode', 'site_code', '사이트코드', '플랜트코드', '사업장코드'] },
    { field: 'siteName', label: '사이트명', required: true, aliases: ['siteName', 'site_name', '사이트명', '플랜트명', '사업장명'] },
    { field: 'customerCode', label: '고객사 코드', aliases: ['customerCode', 'customer_code', '고객사코드', '고객코드'] },
    { field: 'customerId', label: '고객사 ID (호환 입력)', legacy: true, aliases: ['customerId', 'customer_id', '고객사ID', '고객ID'] },
    { field: 'siteTypeCode', label: '사이트 유형', aliases: ['siteTypeCode', 'site_type_code', '사이트유형', '유형'] },
    { field: 'regionCode', label: '지역 코드', aliases: ['regionCode', 'region_code', '지역코드', '지역'] },
    { field: 'address', label: '주소', aliases: ['address', '주소'] },
    { field: 'timezone', label: '타임존', aliases: ['timezone', 'time_zone', '타임존'] },
    { field: 'operationOwnerName', label: '운영 담당', aliases: ['operationOwnerName', 'operation_owner_name', '운영담당', '운영담당자'] },
    { field: 'isActive', label: '활성 여부', aliases: ['isActive', 'is_active', '활성여부', '상태'] },
    { field: 'memo', label: '메모', aliases: ['memo', '비고', '메모'] },
  ],
  systemCatalogs: [
    { field: 'catalogCode', label: '시스템 종류 코드', required: true, aliases: ['catalogCode', 'catalog_code', '시스템종류코드', '카탈로그코드'] },
    { field: 'catalogName', label: '시스템 종류명', required: true, aliases: ['catalogName', 'catalog_name', '시스템종류명', '카탈로그명'] },
    { field: 'parentCatalogCode', label: '상위 종류 코드', aliases: ['parentCatalogCode', 'parent_catalog_code', '상위종류코드', '상위카탈로그코드'] },
    { field: 'parentSystemCatalogId', label: '상위 종류 ID (호환 입력)', legacy: true, aliases: ['parentSystemCatalogId', 'parent_system_catalog_id', '상위종류ID'] },
    { field: 'categoryCode', label: '분류', aliases: ['categoryCode', 'category_code', '분류', '카테고리'] },
    { field: 'vendorName', label: '벤더', aliases: ['vendorName', 'vendor_name', '벤더', '제조사'] },
    { field: 'description', label: '설명', aliases: ['description', '설명'] },
    { field: 'isActive', label: '활성 여부', aliases: ['isActive', 'is_active', '활성여부', '상태'] },
    { field: 'memo', label: '메모', aliases: ['memo', '비고', '메모'] },
  ],
  systemInstances: [
    { field: 'instanceCode', label: '인스턴스 코드', required: true, aliases: ['instanceCode', 'instance_code', '인스턴스코드', '시스템코드'] },
    { field: 'instanceName', label: '인스턴스명', required: true, aliases: ['instanceName', 'instance_name', '인스턴스명', '시스템명'] },
    { field: 'customerCode', label: '고객사 코드', aliases: ['customerCode', 'customer_code', '고객사코드', '고객코드'] },
    { field: 'customerId', label: '고객사 ID (호환 입력)', legacy: true, aliases: ['customerId', 'customer_id', '고객사ID', '고객ID'] },
    { field: 'siteCode', label: '사이트 코드', aliases: ['siteCode', 'site_code', '사이트코드', '플랜트코드'] },
    { field: 'siteId', label: '사이트 ID (호환 입력)', legacy: true, aliases: ['siteId', 'site_id', '사이트ID'] },
    { field: 'systemCatalogCode', label: '시스템 종류 코드', aliases: ['systemCatalogCode', 'system_catalog_code', '시스템종류코드', '카탈로그코드'] },
    { field: 'systemCatalogId', label: '시스템 종류 ID (호환 입력)', legacy: true, aliases: ['systemCatalogId', 'system_catalog_id', '시스템종류ID'] },
    { field: 'environmentCode', label: '환경', aliases: ['environmentCode', 'environment_code', '환경', '환경코드'] },
    { field: 'operationOwnerTypeCode', label: '운영 담당 유형', aliases: ['operationOwnerTypeCode', 'operation_owner_type_code', '운영담당유형'] },
    { field: 'operationOwnerName', label: '운영 담당', aliases: ['operationOwnerName', 'operation_owner_name', '운영담당', '운영담당자'] },
    { field: 'lifecycleStatusCode', label: '수명주기 상태', aliases: ['lifecycleStatusCode', 'lifecycle_status_code', '수명주기상태', '상태코드'] },
    { field: 'isActive', label: '활성 여부', aliases: ['isActive', 'is_active', '활성여부', '상태'] },
    { field: 'memo', label: '메모', aliases: ['memo', '비고', '메모'] },
  ],
  integrations: [
    { field: 'integrationCode', label: '인터페이스 코드', required: true, aliases: ['integrationCode', 'integration_code', '인터페이스코드', '연계코드'] },
    { field: 'integrationName', label: '인터페이스명', required: true, aliases: ['integrationName', 'integration_name', '인터페이스명', '연계명'] },
    { field: 'sourceSystemInstanceCode', label: '출발 시스템 코드', aliases: ['sourceSystemInstanceCode', 'source_system_instance_code', '출발시스템코드', '소스시스템코드'] },
    { field: 'sourceSystemInstanceId', label: '출발 시스템 ID (호환 입력)', legacy: true, aliases: ['sourceSystemInstanceId', 'source_system_instance_id', '출발시스템ID'] },
    { field: 'targetSystemInstanceCode', label: '도착 시스템 코드', aliases: ['targetSystemInstanceCode', 'target_system_instance_code', '도착시스템코드', '타깃시스템코드'] },
    { field: 'targetSystemInstanceId', label: '도착 시스템 ID (호환 입력)', legacy: true, aliases: ['targetSystemInstanceId', 'target_system_instance_id', '도착시스템ID'] },
    { field: 'directionCode', label: '방향', aliases: ['directionCode', 'direction_code', '방향', '방향코드'] },
    { field: 'interfaceTypeCode', label: '방식', aliases: ['interfaceTypeCode', 'interface_type_code', '방식', '인터페이스방식'] },
    { field: 'statusCode', label: '상태', aliases: ['statusCode', 'status_code', '상태', '상태코드'] },
    { field: 'description', label: '설명', aliases: ['description', '설명'] },
    { field: 'isActive', label: '활성 여부', aliases: ['isActive', 'is_active', '활성여부'] },
    { field: 'memo', label: '메모', aliases: ['memo', '비고', '메모'] },
  ],
};

function getImportTemplateFields(entity: ImportEntityKey) {
  return IMPORT_FIELD_CONFIGS[entity].filter((field) => !field.legacy);
}

const IMPORT_PLACEHOLDER = `{
  "sites": [
    { "siteCode": "LS-SEOUL", "siteName": "서울 사업장", "siteTypeCode": "office" }
  ],
  "systemCatalogs": [
    { "catalogCode": "ERP", "catalogName": "ERP", "categoryCode": "business" },
    { "catalogCode": "MES", "catalogName": "MES", "categoryCode": "manufacturing" }
  ],
  "systemInstances": [
    { "instanceCode": "ERP-PROD", "instanceName": "ERP 운영", "siteCode": "LS-SEOUL", "systemCatalogCode": "ERP" },
    { "instanceCode": "MES-PROD", "instanceName": "MES 운영", "siteCode": "LS-SEOUL", "systemCatalogCode": "MES" }
  ],
  "integrations": [
    { "integrationCode": "ERP-MES", "integrationName": "ERP-MES 연계", "sourceSystemInstanceCode": "ERP-PROD", "targetSystemInstanceCode": "MES-PROD" }
  ]
}`;

const IMPORT_TEMPLATE_SAMPLE_ROWS: Record<ImportEntityKey, Record<string, string>> = {
  sites: {
    siteCode: 'LS-SEOUL',
    siteName: '서울 사업장',
    customerCode: 'LS-CUSTOMER',
    siteTypeCode: 'office',
    regionCode: 'KR',
    address: '서울',
    timezone: 'Asia/Seoul',
    operationOwnerName: '운영 담당자',
    isActive: 'true',
    memo: '반입 예시',
  },
  systemCatalogs: {
    catalogCode: 'ERP',
    catalogName: 'ERP',
    categoryCode: 'business',
    vendorName: 'SSOO',
    description: '기간계 시스템',
    isActive: 'true',
    memo: '반입 예시',
  },
  systemInstances: {
    instanceCode: 'ERP-PROD',
    instanceName: 'ERP 운영',
    customerCode: 'LS-CUSTOMER',
    siteCode: 'LS-SEOUL',
    systemCatalogCode: 'ERP',
    environmentCode: 'prod',
    operationOwnerTypeCode: 'internal',
    operationOwnerName: '운영 담당자',
    lifecycleStatusCode: 'active',
    isActive: 'true',
    memo: '반입 예시',
  },
  integrations: {
    integrationCode: 'ERP-MES',
    integrationName: 'ERP-MES 연계',
    sourceSystemInstanceCode: 'ERP-PROD',
    targetSystemInstanceCode: 'MES-PROD',
    directionCode: 'source_to_target',
    interfaceTypeCode: 'api',
    statusCode: 'active',
    description: '운영 데이터 연계',
    isActive: 'true',
    memo: '반입 예시',
  },
};

export function MasterDataPage() {
  const { confirm } = useConfirmStore();
  const [activeTab, setActiveTab] = useState<MasterTab>('sites');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formTab, setFormTab] = useState<MasterTab>('sites');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MasterFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSource, setImportSource] = useState<ImportSourceMode>('json');
  const [importText, setImportText] = useState('');
  const [importEntity, setImportEntity] = useState<ImportEntityKey>('sites');
  const [importFile, setImportFile] = useState<ParsedImportFile | null>(null);
  const [importColumnMapping, setImportColumnMapping] = useState<ImportColumnMapping>({});
  const [importSavedMappings, setImportSavedMappings] = useState<Partial<Record<ImportEntityKey, ImportColumnMapping>>>(() => loadImportMappingProfiles());
  const [selectedImportProfileId, setSelectedImportProfileId] = useState<string>(NONE_VALUE);
  const [importProfileName, setImportProfileName] = useState('');
  const [importProfileIsDefault, setImportProfileIsDefault] = useState(false);
  const [selectedImportProfileHistorySeq, setSelectedImportProfileHistorySeq] = useState<string>(NONE_VALUE);
  const [importUpdateExisting, setImportUpdateExisting] = useState(false);
  const [importReactivateExisting, setImportReactivateExisting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<PmsMasterImportResponse | null>(null);

  const filters = useMemo(() => ({
    page,
    pageSize,
    search: search || undefined,
  }), [page, pageSize, search]);
  const optionFilters = useMemo(() => ({ page: 1, pageSize: 100 }), []);

  const summaryQuery = usePmsMasterSummary();
  const siteQuery = usePlantSites(filters, activeTab === 'sites');
  const catalogQuery = useSystemCatalogs(filters, activeTab === 'catalogs');
  const instanceQuery = useSystemInstances(filters, activeTab === 'instances');
  const integrationQuery = useSystemIntegrations(filters, activeTab === 'integrations');

  const customerOptionQuery = useCustomerList(optionFilters);
  const siteOptionQuery = usePlantSites(optionFilters);
  const catalogOptionQuery = useSystemCatalogs(optionFilters);
  const instanceOptionQuery = useSystemInstances(optionFilters);
  const importProfileQuery = usePmsMasterImportProfiles(
    { entityType: importEntity },
    importDialogOpen && importSource === 'file',
  );
  const importProfileHistoryQuery = usePmsMasterImportProfileHistory(
    selectedImportProfileId === NONE_VALUE ? undefined : selectedImportProfileId,
    importDialogOpen && importSource === 'file',
  );

  const createImportProfileMutation = useCreatePmsMasterImportProfile();
  const updateImportProfileMutation = useUpdatePmsMasterImportProfile();
  const restoreImportProfileMutation = useRestorePmsMasterImportProfile();
  const deactivateImportProfileMutation = useDeactivatePmsMasterImportProfile();
  const createSiteMutation = useCreatePlantSite();
  const updateSiteMutation = useUpdatePlantSite();
  const deactivateSiteMutation = useDeactivatePlantSite();
  const createCatalogMutation = useCreateSystemCatalog();
  const updateCatalogMutation = useUpdateSystemCatalog();
  const deactivateCatalogMutation = useDeactivateSystemCatalog();
  const createInstanceMutation = useCreateSystemInstance();
  const updateInstanceMutation = useUpdateSystemInstance();
  const deactivateInstanceMutation = useDeactivateSystemInstance();
  const createIntegrationMutation = useCreateSystemIntegration();
  const updateIntegrationMutation = useUpdateSystemIntegration();
  const deactivateIntegrationMutation = useDeactivateSystemIntegration();
  const importMasterMutation = useImportPmsMaster();

  const activeResponse = activeTab === 'sites'
    ? siteQuery.data
    : activeTab === 'catalogs'
      ? catalogQuery.data
      : activeTab === 'instances'
        ? instanceQuery.data
        : integrationQuery.data;
  const activeError = activeTab === 'sites'
    ? siteQuery.error
    : activeTab === 'catalogs'
      ? catalogQuery.error
      : activeTab === 'instances'
        ? instanceQuery.error
        : integrationQuery.error;
  const activeIsLoading = activeTab === 'sites'
    ? siteQuery.isLoading
    : activeTab === 'catalogs'
      ? catalogQuery.isLoading
      : activeTab === 'instances'
        ? instanceQuery.isLoading
        : integrationQuery.isLoading;

  const itemsTotal = activeResponse?.data?.total ?? 0;
  const totalPages = activeResponse?.data?.totalPages ?? 0;
  const summary = summaryQuery.data?.data;
  const formLabel = MASTER_TABS.find((tab) => tab.key === formTab)?.label ?? '기준정보';
  const isMutating = createSiteMutation.isPending ||
    updateSiteMutation.isPending ||
    createCatalogMutation.isPending ||
    updateCatalogMutation.isPending ||
    createInstanceMutation.isPending ||
    updateInstanceMutation.isPending ||
    createIntegrationMutation.isPending ||
    updateIntegrationMutation.isPending;
  const canRunImport = importSource === 'json'
    ? importText.trim().length > 0
    : Boolean(importFile && importFile.rows.length > 0);
  const hasSavedImportMapping = Boolean(importSavedMappings[importEntity]);
  const serverImportProfiles = useMemo(
    () => importProfileQuery.data?.data ?? [],
    [importProfileQuery.data],
  );
  const selectedServerImportProfile = useMemo(() => (
    serverImportProfiles.find((profile) => profile.profileId === selectedImportProfileId) ?? null
  ), [selectedImportProfileId, serverImportProfiles]);
  const defaultServerImportProfile = useMemo(() => (
    serverImportProfiles.find((profile) => profile.isDefault) ?? null
  ), [serverImportProfiles]);
  const importProfileHistory = useMemo(
    () => importProfileHistoryQuery.data?.data ?? [],
    [importProfileHistoryQuery.data],
  );
  const selectedImportProfileHistory = useMemo(() => (
    importProfileHistory.find((history) => history.historySeq === selectedImportProfileHistorySeq) ?? null
  ), [importProfileHistory, selectedImportProfileHistorySeq]);
  const isImportProfileMutating = createImportProfileMutation.isPending ||
    updateImportProfileMutation.isPending ||
    restoreImportProfileMutation.isPending ||
    deactivateImportProfileMutation.isPending;

  const customerOptions = useMemo<SelectOption[]>(() => (
    customerOptionQuery.data?.data?.items ?? []
  ).map((item) => ({
    value: item.id,
    label: item.customerName,
    caption: formatCustomerLookupCaption(item),
  })), [customerOptionQuery.data]);

  const siteOptions = useMemo<SelectOption[]>(() => (
    siteOptionQuery.data?.data?.items ?? []
  ).map((item) => ({
    value: item.siteId,
    label: item.siteName,
    caption: item.siteCode,
  })), [siteOptionQuery.data]);

  const catalogOptions = useMemo<SelectOption[]>(() => (
    catalogOptionQuery.data?.data?.items ?? []
  ).map((item) => ({
    value: item.systemCatalogId,
    label: item.catalogName,
    caption: item.catalogCode,
  })), [catalogOptionQuery.data]);

  const instanceOptions = useMemo<SelectOption[]>(() => (
    instanceOptionQuery.data?.data?.items ?? []
  ).map((item) => ({
    value: item.systemInstanceId,
    label: item.instanceName,
    caption: item.instanceCode,
  })), [instanceOptionQuery.data]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleSelectTab = useCallback((tab: MasterTab) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    void summaryQuery.refetch();
    if (activeTab === 'sites') void siteQuery.refetch();
    if (activeTab === 'catalogs') void catalogQuery.refetch();
    if (activeTab === 'instances') void instanceQuery.refetch();
    if (activeTab === 'integrations') void integrationQuery.refetch();
    void customerOptionQuery.refetch();
    void siteOptionQuery.refetch();
    void catalogOptionQuery.refetch();
    void instanceOptionQuery.refetch();
  }, [
    activeTab,
    catalogOptionQuery,
    catalogQuery,
    customerOptionQuery,
    instanceOptionQuery,
    instanceQuery,
    integrationQuery,
    siteOptionQuery,
    siteQuery,
    summaryQuery,
  ]);

  const handleOpenCreate = useCallback(() => {
    setFormMode('create');
    setFormTab(activeTab);
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
    setDialogOpen(true);
  }, [activeTab]);

  const handleOpenImport = useCallback(() => {
    setImportDialogOpen(true);
    setImportError(null);
    setImportResult(null);
  }, []);

  const handleSelectImportSource = useCallback((nextSource: ImportSourceMode) => {
    setImportSource(nextSource);
    setImportError(null);
    setImportResult(null);
  }, []);

  const handleSelectImportEntity = useCallback((nextEntity: ImportEntityKey) => {
    setImportEntity(nextEntity);
    setSelectedImportProfileId(NONE_VALUE);
    setImportProfileName('');
    setImportProfileIsDefault(false);
    setSelectedImportProfileHistorySeq(NONE_VALUE);
    setImportError(null);
    setImportResult(null);
    setImportColumnMapping((current) => (
      importFile
        ? resolveImportColumnMapping(nextEntity, importFile.headers, importSavedMappings)
        : current
    ));
  }, [importFile, importSavedMappings]);

  const handleImportMappingChange = useCallback((field: string, header: string) => {
    setImportColumnMapping((current) => ({ ...current, [field]: header }));
    setImportResult(null);
  }, []);

  const handleImportFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportResult(null);
    try {
      const parsed = parseDelimitedImportFile(file.name, await file.text());
      setImportFile(parsed);
      setImportColumnMapping(resolveImportColumnMapping(
        importEntity,
        parsed.headers,
        importSavedMappings,
        selectedServerImportProfile?.columnMapping ?? defaultServerImportProfile?.columnMapping,
      ));
    } catch (error) {
      setImportFile(null);
      setImportColumnMapping({});
      setImportError(getErrorMessage(error));
    } finally {
      input.value = '';
    }
  }, [defaultServerImportProfile, importEntity, importSavedMappings, selectedServerImportProfile]);

  useEffect(() => {
    if (importSource !== 'file' || !importFile || !defaultServerImportProfile) return;
    if (selectedImportProfileId !== NONE_VALUE) return;
    setSelectedImportProfileId(defaultServerImportProfile.profileId);
    setImportProfileName(defaultServerImportProfile.profileName);
    setImportProfileIsDefault(defaultServerImportProfile.isDefault);
    setSelectedImportProfileHistorySeq(NONE_VALUE);
    setImportColumnMapping(reconcileImportColumnMapping(
      importEntity,
      defaultServerImportProfile.columnMapping,
      importFile.headers,
    ));
  }, [
    defaultServerImportProfile,
    importEntity,
    importFile,
    importSource,
    selectedImportProfileId,
  ]);

  const handleDownloadImportTemplate = useCallback(() => {
    setImportError(null);
    try {
      downloadImportTemplate(importEntity);
    } catch (error) {
      setImportError(getErrorMessage(error));
    }
  }, [importEntity]);

  const handleSaveImportMappingProfile = useCallback(() => {
    setImportError(null);
    setImportResult(null);
    if (!importFile) {
      setImportError('매핑을 저장할 CSV/TSV 파일이 필요합니다.');
      return;
    }

    const nextMapping = reconcileImportColumnMapping(importEntity, importColumnMapping, importFile.headers);
    const mappedCount = Object.values(nextMapping).filter(isMappedColumn).length;
    if (mappedCount === 0) {
      setImportError('저장할 컬럼 매핑이 없습니다.');
      return;
    }

    const nextProfiles = {
      ...importSavedMappings,
      [importEntity]: nextMapping,
    };
    setImportSavedMappings(nextProfiles);
    saveImportMappingProfiles(nextProfiles);
  }, [importColumnMapping, importEntity, importFile, importSavedMappings]);

  const handleLoadImportMappingProfile = useCallback(() => {
    setImportError(null);
    setImportResult(null);
    if (!importFile) {
      setImportError('저장된 매핑을 적용할 CSV/TSV 파일이 필요합니다.');
      return;
    }
    const savedMapping = importSavedMappings[importEntity];
    if (!savedMapping) {
      setImportError('저장된 매핑이 없습니다.');
      return;
    }
    setImportColumnMapping(reconcileImportColumnMapping(importEntity, savedMapping, importFile.headers));
  }, [importEntity, importFile, importSavedMappings]);

  const handleClearImportMappingProfile = useCallback(() => {
    setImportError(null);
    setImportResult(null);
    const nextProfiles = { ...importSavedMappings };
    delete nextProfiles[importEntity];
    setImportSavedMappings(nextProfiles);
    saveImportMappingProfiles(nextProfiles);
  }, [importEntity, importSavedMappings]);

  const handleSelectSharedImportProfile = useCallback((profileId: string) => {
    setSelectedImportProfileId(profileId);
    setSelectedImportProfileHistorySeq(NONE_VALUE);
    setImportError(null);
    setImportResult(null);
    if (profileId === NONE_VALUE) {
      setImportProfileName('');
      setImportProfileIsDefault(false);
      return;
    }
    const profile = serverImportProfiles.find((item) => item.profileId === profileId);
    if (!profile) return;
    setImportProfileName(profile.profileName);
    setImportProfileIsDefault(profile.isDefault);
    if (importFile) {
      setImportColumnMapping(reconcileImportColumnMapping(importEntity, profile.columnMapping, importFile.headers));
    }
  }, [importEntity, importFile, serverImportProfiles]);

  const handleSaveSharedImportMappingProfile = useCallback(() => {
    setImportError(null);
    setImportResult(null);
    if (!importFile) {
      setImportError('공유 매핑을 저장할 CSV/TSV 파일이 필요합니다.');
      return;
    }
    const profileName = importProfileName.trim();
    if (!profileName) {
      setImportError('공유 매핑명을 입력해야 합니다.');
      return;
    }
    const columnMapping = compactImportColumnMapping(importColumnMapping);
    if (Object.keys(columnMapping).length === 0) {
      setImportError('저장할 컬럼 매핑이 없습니다.');
      return;
    }

    if (selectedServerImportProfile) {
      updateImportProfileMutation.mutate({
        profileId: selectedServerImportProfile.profileId,
        data: {
          profileName,
          columnMapping,
          isDefault: importProfileIsDefault,
        },
      }, {
        onSuccess: (response) => {
          if (!response.success || !response.data) {
            setImportError(response.message || '공유 매핑 저장에 실패했습니다.');
            return;
          }
          setSelectedImportProfileId(response.data.profileId);
          setImportProfileName(response.data.profileName);
          setImportProfileIsDefault(response.data.isDefault);
          setSelectedImportProfileHistorySeq(NONE_VALUE);
        },
        onError: (error) => setImportError(getErrorMessage(error)),
      });
      return;
    }

    createImportProfileMutation.mutate({
      entityType: importEntity,
      profileName,
      columnMapping,
      isDefault: importProfileIsDefault,
    }, {
      onSuccess: (response) => {
        if (!response.success || !response.data) {
          setImportError(response.message || '공유 매핑 저장에 실패했습니다.');
          return;
        }
        setSelectedImportProfileId(response.data.profileId);
        setImportProfileName(response.data.profileName);
        setImportProfileIsDefault(response.data.isDefault);
        setSelectedImportProfileHistorySeq(NONE_VALUE);
      },
      onError: (error) => setImportError(getErrorMessage(error)),
    });
  }, [
    createImportProfileMutation,
    importColumnMapping,
    importEntity,
    importFile,
    importProfileIsDefault,
    importProfileName,
    selectedServerImportProfile,
    updateImportProfileMutation,
  ]);

  const handleLoadSharedImportMappingProfile = useCallback(() => {
    setImportError(null);
    setImportResult(null);
    if (!importFile) {
      setImportError('공유 매핑을 적용할 CSV/TSV 파일이 필요합니다.');
      return;
    }
    if (!selectedServerImportProfile) {
      setImportError('선택된 공유 매핑이 없습니다.');
      return;
    }
    setImportColumnMapping(reconcileImportColumnMapping(
      importEntity,
      selectedServerImportProfile.columnMapping,
      importFile.headers,
    ));
  }, [importEntity, importFile, selectedServerImportProfile]);

  const handleRestoreSharedImportMappingProfileHistory = useCallback(() => {
    setImportError(null);
    setImportResult(null);
    if (!selectedServerImportProfile) {
      setImportError('선택된 공유 매핑이 없습니다.');
      return;
    }
    if (!selectedImportProfileHistory) {
      setImportError('복구할 공유 매핑 이력을 선택해야 합니다.');
      return;
    }

    restoreImportProfileMutation.mutate({
      profileId: selectedServerImportProfile.profileId,
      data: { historySeq: selectedImportProfileHistory.historySeq },
    }, {
      onSuccess: (response) => {
        if (!response.success || !response.data) {
          setImportError(response.message || '공유 매핑 이력 복구에 실패했습니다.');
          return;
        }
        setSelectedImportProfileId(response.data.profileId);
        setImportProfileName(response.data.profileName);
        setImportProfileIsDefault(response.data.isDefault);
        setSelectedImportProfileHistorySeq(NONE_VALUE);
        if (importFile) {
          setImportColumnMapping(reconcileImportColumnMapping(
            importEntity,
            response.data.columnMapping,
            importFile.headers,
          ));
        }
      },
      onError: (error) => setImportError(getErrorMessage(error)),
    });
  }, [
    importEntity,
    importFile,
    restoreImportProfileMutation,
    selectedImportProfileHistory,
    selectedServerImportProfile,
  ]);

  const handleDeleteSharedImportMappingProfile = useCallback(() => {
    setImportError(null);
    setImportResult(null);
    if (!selectedServerImportProfile) {
      setImportError('선택된 공유 매핑이 없습니다.');
      return;
    }
    deactivateImportProfileMutation.mutate(selectedServerImportProfile.profileId, {
      onSuccess: (response) => {
        if (!response.success) {
          setImportError(response.message || '공유 매핑 삭제에 실패했습니다.');
          return;
        }
        setSelectedImportProfileId(NONE_VALUE);
        setImportProfileName('');
        setImportProfileIsDefault(false);
        setSelectedImportProfileHistorySeq(NONE_VALUE);
      },
      onError: (error) => setImportError(getErrorMessage(error)),
    });
  }, [deactivateImportProfileMutation, selectedServerImportProfile]);

  const handleOpenEditSite = useCallback((site: PlantSite) => {
    setFormMode('edit');
    setFormTab('sites');
    setEditingId(site.siteId);
    setFormData({
      ...INITIAL_FORM,
      code: site.siteCode,
      name: site.siteName,
      customerId: site.customerId ?? '',
      siteTypeCode: site.siteTypeCode ?? '',
      regionCode: site.regionCode ?? '',
      address: site.address ?? '',
      timezone: site.timezone ?? '',
      operationOwnerName: site.operationOwnerName ?? '',
      memo: site.memo ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEditCatalog = useCallback((catalog: SystemCatalog) => {
    setFormMode('edit');
    setFormTab('catalogs');
    setEditingId(catalog.systemCatalogId);
    setFormData({
      ...INITIAL_FORM,
      code: catalog.catalogCode,
      name: catalog.catalogName,
      parentSystemCatalogId: catalog.parentSystemCatalogId ?? '',
      categoryCode: catalog.categoryCode ?? '',
      vendorName: catalog.vendorName ?? '',
      description: catalog.description ?? '',
      memo: catalog.memo ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEditInstance = useCallback((instance: SystemInstance) => {
    setFormMode('edit');
    setFormTab('instances');
    setEditingId(instance.systemInstanceId);
    setFormData({
      ...INITIAL_FORM,
      code: instance.instanceCode,
      name: instance.instanceName,
      customerId: instance.customerId ?? '',
      siteId: instance.siteId ?? '',
      systemCatalogId: instance.systemCatalogId ?? '',
      environmentCode: instance.environmentCode ?? '',
      operationOwnerTypeCode: instance.operationOwnerTypeCode ?? '',
      operationOwnerName: instance.operationOwnerName ?? '',
      lifecycleStatusCode: instance.lifecycleStatusCode ?? '',
      memo: instance.memo ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEditIntegration = useCallback((integration: SystemIntegration) => {
    setFormMode('edit');
    setFormTab('integrations');
    setEditingId(integration.integrationId);
    setFormData({
      ...INITIAL_FORM,
      code: integration.integrationCode,
      name: integration.integrationName,
      sourceSystemInstanceId: integration.sourceSystemInstanceId,
      targetSystemInstanceId: integration.targetSystemInstanceId,
      directionCode: integration.directionCode ?? '',
      interfaceTypeCode: integration.interfaceTypeCode ?? '',
      statusCode: integration.statusCode ?? '',
      description: integration.description ?? '',
      memo: integration.memo ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const handleDeactivateSite = useCallback(async (site: PlantSite) => {
    const confirmed = await confirm({
      title: '플랜트/사이트를 비활성화할까요?',
      description: `${site.siteName} 항목을 비활성화합니다.`,
      confirmText: '비활성화',
    });
    if (!confirmed) return;
    deactivateSiteMutation.mutate(site.siteId, {
      onError: (error) => toast.error('플랜트/사이트를 비활성화하지 못했습니다.', {
        description: getErrorMessage(error),
      }),
    });
  }, [confirm, deactivateSiteMutation]);

  const handleDeactivateCatalog = useCallback(async (catalog: SystemCatalog) => {
    const confirmed = await confirm({
      title: '시스템 종류를 비활성화할까요?',
      description: `${catalog.catalogName} 항목을 비활성화합니다.`,
      confirmText: '비활성화',
    });
    if (!confirmed) return;
    deactivateCatalogMutation.mutate(catalog.systemCatalogId, {
      onError: (error) => toast.error('시스템 종류를 비활성화하지 못했습니다.', {
        description: getErrorMessage(error),
      }),
    });
  }, [confirm, deactivateCatalogMutation]);

  const handleDeactivateInstance = useCallback(async (instance: SystemInstance) => {
    const confirmed = await confirm({
      title: '시스템 인스턴스를 비활성화할까요?',
      description: `${instance.instanceName} 항목을 비활성화합니다.`,
      confirmText: '비활성화',
    });
    if (!confirmed) return;
    deactivateInstanceMutation.mutate(instance.systemInstanceId, {
      onError: (error) => toast.error('시스템 인스턴스를 비활성화하지 못했습니다.', {
        description: getErrorMessage(error),
      }),
    });
  }, [confirm, deactivateInstanceMutation]);

  const handleDeactivateIntegration = useCallback(async (integration: SystemIntegration) => {
    const confirmed = await confirm({
      title: '인터페이스를 비활성화할까요?',
      description: `${integration.integrationName} 항목을 비활성화합니다.`,
      confirmText: '비활성화',
    });
    if (!confirmed) return;
    deactivateIntegrationMutation.mutate(integration.integrationId, {
      onError: (error) => toast.error('인터페이스를 비활성화하지 못했습니다.', {
        description: getErrorMessage(error),
      }),
    });
  }, [confirm, deactivateIntegrationMutation]);

  const handleMutationSuccess = useCallback((response: { success: boolean; message?: string }) => {
    if (!response.success) {
      setFormError(response.message || '요청 처리 중 오류가 발생했습니다.');
      return;
    }
    setDialogOpen(false);
  }, []);

  const handleMutationError = useCallback((error: unknown) => {
    setFormError(getErrorMessage(error));
  }, []);

  const runImport = useCallback((mode: 'preview' | 'apply') => {
    setImportError(null);
    let payload: ImportPmsMasterRequest;
    try {
      payload = buildImportPayload({
        source: importSource,
        rawJson: importText,
        entity: importEntity,
        file: importFile,
        mapping: importColumnMapping,
      });
    } catch (error) {
      setImportError(getErrorMessage(error));
      return;
    }

    importMasterMutation.mutate({
      ...payload,
      mode,
      options: {
        ...payload.options,
        updateExisting: importUpdateExisting,
        reactivateExisting: importReactivateExisting,
      },
    }, {
      onSuccess: (response) => {
        if (!response.success || !response.data) {
          setImportError(response.message || '기준정보 반입 요청을 처리하지 못했습니다.');
          return;
        }
        setImportResult(response.data);
        if (response.data.applied) {
          handleRefresh();
        }
      },
      onError: (error) => setImportError(getErrorMessage(error)),
    });
  }, [
    handleRefresh,
    importMasterMutation,
    importColumnMapping,
    importEntity,
    importFile,
    importReactivateExisting,
    importSource,
    importText,
    importUpdateExisting,
  ]);

  const handleSubmit = useCallback(() => {
    setFormError(null);

    if (formTab === 'sites') {
      if (formMode === 'create') {
        const request: CreatePlantSiteRequest = {
          siteCode: requiredValue(formData.code),
          siteName: requiredValue(formData.name),
          ...(optionalValue(formData.customerId) && { customerId: optionalValue(formData.customerId) }),
          ...(optionalValue(formData.siteTypeCode) && { siteTypeCode: optionalValue(formData.siteTypeCode) }),
          ...(optionalValue(formData.regionCode) && { regionCode: optionalValue(formData.regionCode) }),
          ...(optionalValue(formData.address) && { address: optionalValue(formData.address) }),
          ...(optionalValue(formData.timezone) && { timezone: optionalValue(formData.timezone) }),
          ...(optionalValue(formData.operationOwnerName) && {
            operationOwnerName: optionalValue(formData.operationOwnerName),
          }),
          ...(optionalValue(formData.memo) && { memo: optionalValue(formData.memo) }),
        };
        createSiteMutation.mutate(request, {
          onSuccess: handleMutationSuccess,
          onError: handleMutationError,
        });
        return;
      }
      if (!editingId) return;
      const request: UpdatePlantSiteRequest = {
        siteName: requiredValue(formData.name),
        customerId: nullableValue(formData.customerId),
        siteTypeCode: nullableValue(formData.siteTypeCode),
        regionCode: nullableValue(formData.regionCode),
        address: nullableValue(formData.address),
        timezone: nullableValue(formData.timezone),
        operationOwnerName: nullableValue(formData.operationOwnerName),
        memo: nullableValue(formData.memo),
      };
      updateSiteMutation.mutate({ siteId: editingId, data: request }, {
        onSuccess: handleMutationSuccess,
        onError: handleMutationError,
      });
      return;
    }

    if (formTab === 'catalogs') {
      if (formMode === 'create') {
        const request: CreateSystemCatalogRequest = {
          catalogCode: requiredValue(formData.code),
          catalogName: requiredValue(formData.name),
          ...(optionalValue(formData.parentSystemCatalogId) && {
            parentSystemCatalogId: optionalValue(formData.parentSystemCatalogId),
          }),
          ...(optionalValue(formData.categoryCode) && { categoryCode: optionalValue(formData.categoryCode) }),
          ...(optionalValue(formData.vendorName) && { vendorName: optionalValue(formData.vendorName) }),
          ...(optionalValue(formData.description) && { description: optionalValue(formData.description) }),
          ...(optionalValue(formData.memo) && { memo: optionalValue(formData.memo) }),
        };
        createCatalogMutation.mutate(request, {
          onSuccess: handleMutationSuccess,
          onError: handleMutationError,
        });
        return;
      }
      if (!editingId) return;
      const request: UpdateSystemCatalogRequest = {
        catalogName: requiredValue(formData.name),
        parentSystemCatalogId: nullableValue(formData.parentSystemCatalogId),
        categoryCode: nullableValue(formData.categoryCode),
        vendorName: nullableValue(formData.vendorName),
        description: nullableValue(formData.description),
        memo: nullableValue(formData.memo),
      };
      updateCatalogMutation.mutate({ systemCatalogId: editingId, data: request }, {
        onSuccess: handleMutationSuccess,
        onError: handleMutationError,
      });
      return;
    }

    if (formTab === 'instances') {
      if (formMode === 'create') {
        const request: CreateSystemInstanceRequest = {
          instanceCode: requiredValue(formData.code),
          instanceName: requiredValue(formData.name),
          ...(optionalValue(formData.customerId) && { customerId: optionalValue(formData.customerId) }),
          ...(optionalValue(formData.siteId) && { siteId: optionalValue(formData.siteId) }),
          ...(optionalValue(formData.systemCatalogId) && {
            systemCatalogId: optionalValue(formData.systemCatalogId),
          }),
          ...(optionalValue(formData.environmentCode) && {
            environmentCode: optionalValue(formData.environmentCode),
          }),
          ...(optionalValue(formData.operationOwnerTypeCode) && {
            operationOwnerTypeCode: optionalValue(formData.operationOwnerTypeCode),
          }),
          ...(optionalValue(formData.operationOwnerName) && {
            operationOwnerName: optionalValue(formData.operationOwnerName),
          }),
          ...(optionalValue(formData.lifecycleStatusCode) && {
            lifecycleStatusCode: optionalValue(formData.lifecycleStatusCode),
          }),
          ...(optionalValue(formData.memo) && { memo: optionalValue(formData.memo) }),
        };
        createInstanceMutation.mutate(request, {
          onSuccess: handleMutationSuccess,
          onError: handleMutationError,
        });
        return;
      }
      if (!editingId) return;
      const request: UpdateSystemInstanceRequest = {
        instanceName: requiredValue(formData.name),
        customerId: nullableValue(formData.customerId),
        siteId: nullableValue(formData.siteId),
        systemCatalogId: nullableValue(formData.systemCatalogId),
        environmentCode: nullableValue(formData.environmentCode),
        operationOwnerTypeCode: nullableValue(formData.operationOwnerTypeCode),
        operationOwnerName: nullableValue(formData.operationOwnerName),
        lifecycleStatusCode: nullableValue(formData.lifecycleStatusCode) ?? 'active',
        memo: nullableValue(formData.memo),
      };
      updateInstanceMutation.mutate({ systemInstanceId: editingId, data: request }, {
        onSuccess: handleMutationSuccess,
        onError: handleMutationError,
      });
      return;
    }

    if (formMode === 'create') {
      const request: CreateSystemIntegrationRequest = {
        integrationCode: requiredValue(formData.code),
        integrationName: requiredValue(formData.name),
        sourceSystemInstanceId: requiredValue(formData.sourceSystemInstanceId),
        targetSystemInstanceId: requiredValue(formData.targetSystemInstanceId),
        ...(optionalValue(formData.directionCode) && { directionCode: optionalValue(formData.directionCode) }),
        ...(optionalValue(formData.interfaceTypeCode) && {
          interfaceTypeCode: optionalValue(formData.interfaceTypeCode),
        }),
        ...(optionalValue(formData.statusCode) && { statusCode: optionalValue(formData.statusCode) }),
        ...(optionalValue(formData.description) && { description: optionalValue(formData.description) }),
        ...(optionalValue(formData.memo) && { memo: optionalValue(formData.memo) }),
      };
      createIntegrationMutation.mutate(request, {
        onSuccess: handleMutationSuccess,
        onError: handleMutationError,
      });
      return;
    }
    if (!editingId) return;
    const request: UpdateSystemIntegrationRequest = {
      integrationName: requiredValue(formData.name),
      sourceSystemInstanceId: requiredValue(formData.sourceSystemInstanceId),
      targetSystemInstanceId: requiredValue(formData.targetSystemInstanceId),
      directionCode: nullableValue(formData.directionCode),
      interfaceTypeCode: nullableValue(formData.interfaceTypeCode),
      statusCode: nullableValue(formData.statusCode) ?? 'active',
      description: nullableValue(formData.description),
      memo: nullableValue(formData.memo),
    };
    updateIntegrationMutation.mutate({ integrationId: editingId, data: request }, {
      onSuccess: handleMutationSuccess,
      onError: handleMutationError,
    });
  }, [
    createCatalogMutation,
    createInstanceMutation,
    createIntegrationMutation,
    createSiteMutation,
    editingId,
    formData,
    formMode,
    formTab,
    handleMutationError,
    handleMutationSuccess,
    updateCatalogMutation,
    updateInstanceMutation,
    updateIntegrationMutation,
    updateSiteMutation,
  ]);

  const updateField = useCallback(<K extends keyof MasterFormData>(field: K, value: MasterFormData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
  }, []);

  if (activeError) {
    return <ErrorState error={activeError instanceof Error ? activeError.message : '기준정보를 불러오지 못했습니다.'} onRetry={handleRefresh} />;
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">기준정보</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenImport}>
            <Upload className="h-4 w-4" />
            기준정보 반입
          </Button>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            기준정보 추가
          </Button>
        </div>
      </div>

      <div className="border-b px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {MASTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectTab(tab.key)}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span className={cn(
                  'rounded px-1.5 py-0.5 text-xs',
                  active ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-ssoo-content-bg text-ssoo-primary',
                )}>
                  {summary?.[tab.countKey] ?? '-'}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b px-6 py-3">
        <div className="flex w-full max-w-md items-center gap-2">
          <SsooSearchInput
            id="pms-master-data-search-input"
            name="pms-master-data-search-query"
            ariaLabel="PMS 기준정보 검색"
            intent="data-filter"
            placeholder="코드, 이름, 담당, 유형 검색"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">전체 {itemsTotal}건</span>
      </div>

      <div className="flex-1 overflow-auto">
        {activeIsLoading ? (
          <LoadingState message="기준정보를 불러오는 중..." />
        ) : itemsTotal === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {search ? '검색 결과가 없습니다.' : '등록된 기준정보가 없습니다.'}
          </div>
        ) : (
          <MasterTable
            activeTab={activeTab}
            sites={siteQuery.data?.data?.items ?? []}
            catalogs={catalogQuery.data?.data?.items ?? []}
            instances={instanceQuery.data?.data?.items ?? []}
            integrations={integrationQuery.data?.data?.items ?? []}
            onEditSite={handleOpenEditSite}
            onDeactivateSite={handleDeactivateSite}
            onEditCatalog={handleOpenEditCatalog}
            onDeactivateCatalog={handleDeactivateCatalog}
            onEditInstance={handleOpenEditInstance}
            onDeactivateInstance={handleDeactivateInstance}
            onEditIntegration={handleOpenEditIntegration}
            onDeactivateIntegration={handleDeactivateIntegration}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-6 py-3">
          <span className="text-sm text-muted-foreground">
            {page}/{totalPages}페이지
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? `${formLabel} 추가` : `${formLabel} 수정`}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? '새 기준정보를 등록합니다.' : '기준정보 속성을 수정합니다.'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <SsooErrorNotice className="px-3 py-2" error={formError} />
          )}

          <MasterFormFields
            tab={formTab}
            mode={formMode}
            editingId={editingId}
            formData={formData}
            customerOptions={customerOptions}
            siteOptions={siteOptions}
            catalogOptions={catalogOptions}
            instanceOptions={instanceOptions}
            onChange={updateField}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isMutating || !isFormValid(formTab, formMode, formData)}
            >
              {isMutating ? '처리 중...' : formMode === 'create' ? '추가' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>기준정보 반입</DialogTitle>
            <DialogDescription>
              플랜트/사이트, 시스템 종류, 시스템 인스턴스, 인터페이스 기준정보를 검증 후 반영합니다.
            </DialogDescription>
          </DialogHeader>

          {importError && (
            <SsooErrorNotice className="px-3 py-2" error={importError} />
          )}

          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={importSource === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectImportSource('json')}
              >
                JSON 입력
              </Button>
              <Button
                type="button"
                variant={importSource === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectImportSource('file')}
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV/TSV 파일
              </Button>
            </div>

            {importSource === 'json' ? (
              <Textarea
                className="min-h-64 font-mono text-xs"
                placeholder={IMPORT_PLACEHOLDER}
                value={importText}
                onChange={(event) => {
                  setImportText(event.target.value);
                  setImportResult(null);
                }}
              />
            ) : (
              <ImportFileMappingPanel
                entity={importEntity}
                file={importFile}
                mapping={importColumnMapping}
                hasSavedMapping={hasSavedImportMapping}
                sharedProfiles={serverImportProfiles}
                selectedSharedProfileId={selectedImportProfileId}
                sharedProfileName={importProfileName}
                sharedProfileIsDefault={importProfileIsDefault}
                sharedProfileHistory={importProfileHistory}
                selectedSharedProfileHistorySeq={selectedImportProfileHistorySeq}
                isSharedProfileHistoryLoading={importProfileHistoryQuery.isFetching}
                isSharedProfileMutating={isImportProfileMutating}
                onEntityChange={handleSelectImportEntity}
                onFileChange={handleImportFileChange}
                onMappingChange={handleImportMappingChange}
                onSharedProfileChange={handleSelectSharedImportProfile}
                onSharedProfileNameChange={setImportProfileName}
                onSharedProfileDefaultChange={setImportProfileIsDefault}
                onSharedProfileHistoryChange={setSelectedImportProfileHistorySeq}
                onDownloadTemplate={handleDownloadImportTemplate}
                onSaveMapping={handleSaveImportMappingProfile}
                onLoadSavedMapping={handleLoadImportMappingProfile}
                onClearSavedMapping={handleClearImportMappingProfile}
                onSaveSharedMapping={handleSaveSharedImportMappingProfile}
                onLoadSharedMapping={handleLoadSharedImportMappingProfile}
                onRestoreSharedProfileHistory={handleRestoreSharedImportMappingProfileHistory}
                onDeleteSharedMapping={handleDeleteSharedImportMappingProfile}
              />
            )}

            <div className="flex flex-wrap items-center gap-5 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={importUpdateExisting}
                  onCheckedChange={(checked) => setImportUpdateExisting(checked === true)}
                />
                <span>기존 코드 갱신</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={importReactivateExisting}
                  onCheckedChange={(checked) => setImportReactivateExisting(checked === true)}
                />
                <span>비활성 행 재활성화</span>
              </label>
            </div>
          </div>

          {importResult && <ImportResultPanel result={importResult} />}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              닫기
            </Button>
            <Button
              variant="outline"
              onClick={() => runImport('preview')}
              disabled={importMasterMutation.isPending || !canRunImport}
            >
              {importMasterMutation.isPending ? '검증 중...' : '미리보기'}
            </Button>
            <Button
              onClick={() => runImport('apply')}
              disabled={importMasterMutation.isPending || !canRunImport}
            >
              {importMasterMutation.isPending ? '적용 중...' : '적용'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MasterTable({
  activeTab,
  sites,
  catalogs,
  instances,
  integrations,
  onEditSite,
  onDeactivateSite,
  onEditCatalog,
  onDeactivateCatalog,
  onEditInstance,
  onDeactivateInstance,
  onEditIntegration,
  onDeactivateIntegration,
}: {
  activeTab: MasterTab;
  sites: PlantSite[];
  catalogs: SystemCatalog[];
  instances: SystemInstance[];
  integrations: SystemIntegration[];
  onEditSite: (row: PlantSite) => void;
  onDeactivateSite: (row: PlantSite) => void | Promise<void>;
  onEditCatalog: (row: SystemCatalog) => void;
  onDeactivateCatalog: (row: SystemCatalog) => void | Promise<void>;
  onEditInstance: (row: SystemInstance) => void;
  onDeactivateInstance: (row: SystemInstance) => void | Promise<void>;
  onEditIntegration: (row: SystemIntegration) => void;
  onDeactivateIntegration: (row: SystemIntegration) => void | Promise<void>;
}) {
  if (activeTab === 'sites') {
    return <PlantSiteTable rows={sites} onEdit={onEditSite} onDeactivate={onDeactivateSite} />;
  }
  if (activeTab === 'catalogs') {
    return <SystemCatalogTable rows={catalogs} onEdit={onEditCatalog} onDeactivate={onDeactivateCatalog} />;
  }
  if (activeTab === 'instances') {
    return <SystemInstanceTable rows={instances} onEdit={onEditInstance} onDeactivate={onDeactivateInstance} />;
  }
  return <SystemIntegrationTable rows={integrations} onEdit={onEditIntegration} onDeactivate={onDeactivateIntegration} />;
}

function ImportFileMappingPanel({
  entity,
  file,
  mapping,
  hasSavedMapping,
  sharedProfiles,
  selectedSharedProfileId,
  sharedProfileName,
  sharedProfileIsDefault,
  sharedProfileHistory,
  selectedSharedProfileHistorySeq,
  isSharedProfileHistoryLoading,
  isSharedProfileMutating,
  onEntityChange,
  onFileChange,
  onMappingChange,
  onSharedProfileChange,
  onSharedProfileNameChange,
  onSharedProfileDefaultChange,
  onSharedProfileHistoryChange,
  onDownloadTemplate,
  onSaveMapping,
  onLoadSavedMapping,
  onClearSavedMapping,
  onSaveSharedMapping,
  onLoadSharedMapping,
  onRestoreSharedProfileHistory,
  onDeleteSharedMapping,
}: {
  entity: ImportEntityKey;
  file: ParsedImportFile | null;
  mapping: ImportColumnMapping;
  hasSavedMapping: boolean;
  sharedProfiles: PmsMasterImportProfile[];
  selectedSharedProfileId: string;
  sharedProfileName: string;
  sharedProfileIsDefault: boolean;
  sharedProfileHistory: PmsMasterImportProfileHistory[];
  selectedSharedProfileHistorySeq: string;
  isSharedProfileHistoryLoading: boolean;
  isSharedProfileMutating: boolean;
  onEntityChange: (entity: ImportEntityKey) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onMappingChange: (field: string, header: string) => void;
  onSharedProfileChange: (profileId: string) => void;
  onSharedProfileNameChange: (profileName: string) => void;
  onSharedProfileDefaultChange: (checked: boolean) => void;
  onSharedProfileHistoryChange: (historySeq: string) => void;
  onDownloadTemplate: () => void;
  onSaveMapping: () => void;
  onLoadSavedMapping: () => void;
  onClearSavedMapping: () => void;
  onSaveSharedMapping: () => void;
  onLoadSharedMapping: () => void;
  onRestoreSharedProfileHistory: () => void;
  onDeleteSharedMapping: () => void;
}) {
  const fields = IMPORT_FIELD_CONFIGS[entity];
  const previewRows = file?.rows.slice(0, 5) ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDownloadTemplate}>
          <Download className="h-4 w-4" />
          템플릿 다운로드
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onSaveMapping} disabled={!file}>
          <Save className="h-4 w-4" />
          매핑 저장
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLoadSavedMapping}
          disabled={!file || !hasSavedMapping}
        >
          <RotateCcw className="h-4 w-4" />
          저장 매핑 불러오기
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearSavedMapping}
          disabled={!hasSavedMapping}
        >
          <Trash2 className="h-4 w-4" />
          저장 매핑 삭제
        </Button>
      </div>

      <div className="grid gap-3 rounded border px-3 py-3 lg:grid-cols-[220px_minmax(220px,1fr)_150px_auto]">
        <div>
          <label className="mb-1.5 block text-sm font-medium">공유 매핑</label>
          <Select value={selectedSharedProfileId} onValueChange={onSharedProfileChange}>
            <SelectTrigger>
              <SelectValue placeholder="선택 안 함" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
              {sharedProfiles.map((profile) => (
                <SelectItem key={profile.profileId} value={profile.profileId}>
                  {profile.profileName}{profile.isDefault ? ' · 기본' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">공유 매핑명</label>
          <Input
            value={sharedProfileName}
            onChange={(event) => onSharedProfileNameChange(event.target.value)}
            placeholder="예: LS 표준 사이트 반입"
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <Checkbox
            checked={sharedProfileIsDefault}
            onCheckedChange={(checked) => onSharedProfileDefaultChange(checked === true)}
            disabled={isSharedProfileMutating}
          />
          <span>기본 공유 매핑</span>
        </label>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadSharedMapping}
            disabled={!file || selectedSharedProfileId === NONE_VALUE || isSharedProfileMutating}
          >
            <RotateCcw className="h-4 w-4" />
            공유 불러오기
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveSharedMapping}
            disabled={!file || isSharedProfileMutating}
          >
            <Save className="h-4 w-4" />
            공유 저장
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDeleteSharedMapping}
            disabled={selectedSharedProfileId === NONE_VALUE || isSharedProfileMutating}
          >
            <Trash2 className="h-4 w-4" />
            공유 삭제
          </Button>
        </div>
      </div>

      {selectedSharedProfileId !== NONE_VALUE && (
        <div className="grid gap-3 rounded border px-3 py-3 lg:grid-cols-[minmax(240px,1fr)_auto]">
          <div>
            <label className="mb-1.5 block text-sm font-medium">공유 매핑 이력</label>
            <Select
              value={selectedSharedProfileHistorySeq}
              onValueChange={onSharedProfileHistoryChange}
              disabled={isSharedProfileHistoryLoading || sharedProfileHistory.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isSharedProfileHistoryLoading ? '이력 불러오는 중' : '이력 선택'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>이력 선택 안 함</SelectItem>
                {sharedProfileHistory.map((history) => (
                  <SelectItem key={history.historySeq} value={history.historySeq}>
                    {formatImportProfileHistoryLabel(history)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRestoreSharedProfileHistory}
              disabled={
                selectedSharedProfileHistorySeq === NONE_VALUE ||
                isSharedProfileHistoryLoading ||
                isSharedProfileMutating
              }
            >
              <RotateCcw className="h-4 w-4" />
              이력 복구
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[240px_1fr]">
        <div>
          <label className="mb-1.5 block text-sm font-medium">반입 대상</label>
          <Select value={entity} onValueChange={(nextValue) => onEntityChange(nextValue as ImportEntityKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMPORT_ENTITY_OPTIONS.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">CSV/TSV 파일</label>
          <Input
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
            onChange={(event) => {
              void onFileChange(event);
            }}
          />
        </div>
      </div>

      {!file ? (
        <div className="rounded border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          첫 행을 헤더로 가진 CSV 또는 TSV 파일을 선택하면 컬럼 매핑과 행 미리보기가 표시됩니다.
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">{file.fileName}</span>
            <span className="text-muted-foreground">컬럼 {file.headers.length}개</span>
            <span className="text-muted-foreground">행 {file.rows.length}개</span>
          </div>

          <div className="overflow-hidden rounded border">
            <div className="border-b bg-muted px-3 py-2 text-sm font-medium">컬럼 매핑</div>
            <div className="max-h-72 overflow-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b bg-muted">
                    <TableHead className="w-48 px-3 py-2 text-left font-medium text-muted-foreground">반입 필드</TableHead>
                    <TableHead className="w-24 px-3 py-2 text-left font-medium text-muted-foreground">필수</TableHead>
                    <TableHead className="px-3 py-2 text-left font-medium text-muted-foreground">파일 컬럼</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field) => (
                    <TableRow key={field.field} className="border-b">
                      <TableCell className="px-3 py-2 font-medium">{field.label}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">
                        {field.legacy ? '호환' : field.required ? '필수' : '-'}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Select
                          value={mapping[field.field] || NONE_VALUE}
                          onValueChange={(header) => onMappingChange(field.field, header)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="선택 안 함" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
                            {file.headers.map((header) => (
                              <SelectItem key={`${field.field}-${header}`} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="overflow-hidden rounded border">
            <div className="border-b bg-muted px-3 py-2 text-sm font-medium">행 미리보기</div>
            <div className="max-h-48 overflow-auto">
              <Table className="w-full text-xs">
                <TableHeader>
                  <TableRow className="border-b bg-muted">
                    {file.headers.map((header) => (
                      <TableHead key={header} className="min-w-32 px-3 py-2 text-left font-medium text-muted-foreground">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, index) => (
                    <TableRow key={`preview-${index}`} className="border-b">
                      {file.headers.map((header) => (
                        <TableCell key={`${index}-${header}`} className="px-3 py-2">
                          {formatValue(row[header])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportResultPanel({ result }: { result: PmsMasterImportResponse }) {
  return (
    <div className="overflow-hidden rounded border">
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted px-3 py-2 text-sm">
        <span className="font-medium">{result.applied ? '적용 완료' : '검증 결과'}</span>
        <span className="text-muted-foreground">전체 {result.summary.total}</span>
        <span className="text-ssoo-success">생성 {result.summary.create}</span>
        <span className="text-ssoo-info">갱신 {result.summary.update}</span>
        <span className="text-muted-foreground">건너뜀 {result.summary.skip}</span>
        <span className="text-ssoo-danger">오류 {result.summary.error}</span>
      </div>
      <div className="max-h-72 overflow-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b bg-muted">
              <TableHead className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">구분</TableHead>
              <TableHead className="w-36 px-3 py-2 text-left font-medium text-muted-foreground">코드</TableHead>
              <TableHead className="w-40 px-3 py-2 text-left font-medium text-muted-foreground">이름</TableHead>
              <TableHead className="w-24 px-3 py-2 text-left font-medium text-muted-foreground">상태</TableHead>
              <TableHead className="px-3 py-2 text-left font-medium text-muted-foreground">메시지</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((row) => (
              <TableRow key={`${row.entityType}-${row.index}`} className="border-b">
                <TableCell className="px-3 py-2 text-muted-foreground">{formatEntityType(row.entityType)}</TableCell>
                <TableCell className="px-3 py-2 font-mono text-xs">{row.code}</TableCell>
                <TableCell className="px-3 py-2">{formatValue(row.name)}</TableCell>
                <TableCell className="px-3 py-2">
                  <ImportStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="px-3 py-2 text-muted-foreground">{row.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PlantSiteTable({
  rows,
  onEdit,
  onDeactivate,
}: {
  rows: PlantSite[];
  onEdit: (row: PlantSite) => void;
  onDeactivate: (row: PlantSite) => void | Promise<void>;
}) {
  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b bg-muted">
          <TableHead className="w-44 px-4 py-2.5 text-left font-medium text-muted-foreground">코드</TableHead>
          <TableHead className="px-4 py-2.5 text-left font-medium text-muted-foreground">플랜트/사이트</TableHead>
          <TableHead className="w-44 px-4 py-2.5 text-left font-medium text-muted-foreground">고객사</TableHead>
          <TableHead className="w-28 px-4 py-2.5 text-left font-medium text-muted-foreground">유형</TableHead>
          <TableHead className="px-4 py-2.5 text-left font-medium text-muted-foreground">주소</TableHead>
          <TableHead className="w-44 px-4 py-2.5 text-left font-medium text-muted-foreground">운영 담당</TableHead>
          <TableHead className="w-20 px-4 py-2.5 text-center font-medium text-muted-foreground">상태</TableHead>
          <TableHead className="w-24 px-4 py-2.5 text-center font-medium text-muted-foreground">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.siteId} className="border-b hover:bg-muted">
            <TableCell className="px-4 py-2.5 font-mono text-xs">{row.siteCode}</TableCell>
            <TableCell className="px-4 py-2.5 font-medium">{row.siteName}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.customerName)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.siteTypeCode)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.address)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.operationOwnerName)}</TableCell>
            <TableCell className="px-4 py-2.5 text-center"><StatusBadge active={row.isActive} /></TableCell>
            <TableCell className="px-4 py-2.5 text-center">
              <RowActions active={row.isActive} onEdit={() => onEdit(row)} onDeactivate={() => onDeactivate(row)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SystemCatalogTable({
  rows,
  onEdit,
  onDeactivate,
}: {
  rows: SystemCatalog[];
  onEdit: (row: SystemCatalog) => void;
  onDeactivate: (row: SystemCatalog) => void | Promise<void>;
}) {
  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b bg-muted">
          <TableHead className="w-44 px-4 py-2.5 text-left font-medium text-muted-foreground">코드</TableHead>
          <TableHead className="px-4 py-2.5 text-left font-medium text-muted-foreground">시스템 종류</TableHead>
          <TableHead className="w-40 px-4 py-2.5 text-left font-medium text-muted-foreground">분류</TableHead>
          <TableHead className="w-40 px-4 py-2.5 text-left font-medium text-muted-foreground">벤더</TableHead>
          <TableHead className="px-4 py-2.5 text-left font-medium text-muted-foreground">설명</TableHead>
          <TableHead className="w-20 px-4 py-2.5 text-center font-medium text-muted-foreground">상태</TableHead>
          <TableHead className="w-24 px-4 py-2.5 text-center font-medium text-muted-foreground">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.systemCatalogId} className="border-b hover:bg-muted">
            <TableCell className="px-4 py-2.5 font-mono text-xs">{row.catalogCode}</TableCell>
            <TableCell className="px-4 py-2.5 font-medium">{row.catalogName}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.categoryCode)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.vendorName)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.description)}</TableCell>
            <TableCell className="px-4 py-2.5 text-center"><StatusBadge active={row.isActive} /></TableCell>
            <TableCell className="px-4 py-2.5 text-center">
              <RowActions active={row.isActive} onEdit={() => onEdit(row)} onDeactivate={() => onDeactivate(row)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SystemInstanceTable({
  rows,
  onEdit,
  onDeactivate,
}: {
  rows: SystemInstance[];
  onEdit: (row: SystemInstance) => void;
  onDeactivate: (row: SystemInstance) => void | Promise<void>;
}) {
  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b bg-muted">
          <TableHead className="w-48 px-4 py-2.5 text-left font-medium text-muted-foreground">코드</TableHead>
          <TableHead className="px-4 py-2.5 text-left font-medium text-muted-foreground">시스템</TableHead>
          <TableHead className="w-40 px-4 py-2.5 text-left font-medium text-muted-foreground">고객사</TableHead>
          <TableHead className="w-44 px-4 py-2.5 text-left font-medium text-muted-foreground">사이트</TableHead>
          <TableHead className="w-36 px-4 py-2.5 text-left font-medium text-muted-foreground">종류</TableHead>
          <TableHead className="w-24 px-4 py-2.5 text-left font-medium text-muted-foreground">환경</TableHead>
          <TableHead className="w-44 px-4 py-2.5 text-left font-medium text-muted-foreground">운영 담당</TableHead>
          <TableHead className="w-20 px-4 py-2.5 text-center font-medium text-muted-foreground">상태</TableHead>
          <TableHead className="w-24 px-4 py-2.5 text-center font-medium text-muted-foreground">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.systemInstanceId} className="border-b hover:bg-muted">
            <TableCell className="px-4 py-2.5 font-mono text-xs">{row.instanceCode}</TableCell>
            <TableCell className="px-4 py-2.5 font-medium">{row.instanceName}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.customerName)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.siteName)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.catalogName)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.environmentCode)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.operationOwnerName)}</TableCell>
            <TableCell className="px-4 py-2.5 text-center"><StatusBadge active={row.isActive} /></TableCell>
            <TableCell className="px-4 py-2.5 text-center">
              <RowActions active={row.isActive} onEdit={() => onEdit(row)} onDeactivate={() => onDeactivate(row)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SystemIntegrationTable({
  rows,
  onEdit,
  onDeactivate,
}: {
  rows: SystemIntegration[];
  onEdit: (row: SystemIntegration) => void;
  onDeactivate: (row: SystemIntegration) => void | Promise<void>;
}) {
  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b bg-muted">
          <TableHead className="w-48 px-4 py-2.5 text-left font-medium text-muted-foreground">코드</TableHead>
          <TableHead className="px-4 py-2.5 text-left font-medium text-muted-foreground">인터페이스</TableHead>
          <TableHead className="w-44 px-4 py-2.5 text-left font-medium text-muted-foreground">출발 시스템</TableHead>
          <TableHead className="w-44 px-4 py-2.5 text-left font-medium text-muted-foreground">도착 시스템</TableHead>
          <TableHead className="w-28 px-4 py-2.5 text-left font-medium text-muted-foreground">방식</TableHead>
          <TableHead className="w-24 px-4 py-2.5 text-left font-medium text-muted-foreground">상태</TableHead>
          <TableHead className="px-4 py-2.5 text-left font-medium text-muted-foreground">설명</TableHead>
          <TableHead className="w-24 px-4 py-2.5 text-center font-medium text-muted-foreground">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.integrationId} className="border-b hover:bg-muted">
            <TableCell className="px-4 py-2.5 font-mono text-xs">{row.integrationCode}</TableCell>
            <TableCell className="px-4 py-2.5 font-medium">{row.integrationName}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.sourceSystemInstanceName)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.targetSystemInstanceName)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.interfaceTypeCode)}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{row.statusCode}</TableCell>
            <TableCell className="px-4 py-2.5 text-muted-foreground">{formatValue(row.description)}</TableCell>
            <TableCell className="px-4 py-2.5 text-center">
              <RowActions active={row.isActive} onEdit={() => onEdit(row)} onDeactivate={() => onDeactivate(row)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MasterFormFields({
  tab,
  mode,
  editingId,
  formData,
  customerOptions,
  siteOptions,
  catalogOptions,
  instanceOptions,
  onChange,
}: {
  tab: MasterTab;
  mode: FormMode;
  editingId: string | null;
  formData: MasterFormData;
  customerOptions: SelectOption[];
  siteOptions: SelectOption[];
  catalogOptions: SelectOption[];
  instanceOptions: SelectOption[];
  onChange: <K extends keyof MasterFormData>(field: K, value: MasterFormData[K]) => void;
}) {
  if (tab === 'sites') {
    return (
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="사이트 코드" required value={formData.code} disabled={mode === 'edit'} onChange={(value) => onChange('code', value)} />
          <TextField label="사이트명" required value={formData.name} onChange={(value) => onChange('name', value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="고객사" value={formData.customerId} options={customerOptions} onChange={(value) => onChange('customerId', value)} />
          <TextField label="사이트 유형" value={formData.siteTypeCode} placeholder="plant, office, data-center" onChange={(value) => onChange('siteTypeCode', value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="지역 코드" value={formData.regionCode} placeholder="KR, US, EU" onChange={(value) => onChange('regionCode', value)} />
          <TextField label="타임존" value={formData.timezone} placeholder="Asia/Seoul" onChange={(value) => onChange('timezone', value)} />
        </div>
        <TextField label="주소" value={formData.address} onChange={(value) => onChange('address', value)} />
        <TextField label="운영 담당" value={formData.operationOwnerName} onChange={(value) => onChange('operationOwnerName', value)} />
        <TextField label="메모" value={formData.memo} onChange={(value) => onChange('memo', value)} />
      </div>
    );
  }

  if (tab === 'catalogs') {
    const parentOptions = editingId
      ? catalogOptions.filter((option) => option.value !== editingId)
      : catalogOptions;
    return (
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="시스템 종류 코드" required value={formData.code} disabled={mode === 'edit'} onChange={(value) => onChange('code', value)} />
          <TextField label="시스템 종류명" required value={formData.name} onChange={(value) => onChange('name', value)} />
        </div>
        <SelectField label="상위 시스템 종류" value={formData.parentSystemCatalogId} options={parentOptions} onChange={(value) => onChange('parentSystemCatalogId', value)} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="분류" value={formData.categoryCode} placeholder="ERP, MES, SCM" onChange={(value) => onChange('categoryCode', value)} />
          <TextField label="벤더" value={formData.vendorName} onChange={(value) => onChange('vendorName', value)} />
        </div>
        <TextField label="설명" value={formData.description} onChange={(value) => onChange('description', value)} />
        <TextField label="메모" value={formData.memo} onChange={(value) => onChange('memo', value)} />
      </div>
    );
  }

  if (tab === 'instances') {
    return (
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="인스턴스 코드" required value={formData.code} disabled={mode === 'edit'} onChange={(value) => onChange('code', value)} />
          <TextField label="인스턴스명" required value={formData.name} onChange={(value) => onChange('name', value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="고객사" value={formData.customerId} options={customerOptions} onChange={(value) => onChange('customerId', value)} />
          <SelectField label="플랜트/사이트" value={formData.siteId} options={siteOptions} onChange={(value) => onChange('siteId', value)} />
        </div>
        <SelectField label="시스템 종류" value={formData.systemCatalogId} options={catalogOptions} onChange={(value) => onChange('systemCatalogId', value)} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="환경" value={formData.environmentCode} placeholder="prod, dev, stage" onChange={(value) => onChange('environmentCode', value)} />
          <TextField label="수명주기 상태" value={formData.lifecycleStatusCode} placeholder="active" onChange={(value) => onChange('lifecycleStatusCode', value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="운영 담당 유형" value={formData.operationOwnerTypeCode} placeholder="internal, vendor" onChange={(value) => onChange('operationOwnerTypeCode', value)} />
          <TextField label="운영 담당" value={formData.operationOwnerName} onChange={(value) => onChange('operationOwnerName', value)} />
        </div>
        <TextField label="메모" value={formData.memo} onChange={(value) => onChange('memo', value)} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="인터페이스 코드" required value={formData.code} disabled={mode === 'edit'} onChange={(value) => onChange('code', value)} />
        <TextField label="인터페이스명" required value={formData.name} onChange={(value) => onChange('name', value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="출발 시스템" required value={formData.sourceSystemInstanceId} options={instanceOptions} onChange={(value) => onChange('sourceSystemInstanceId', value)} />
        <SelectField label="도착 시스템" required value={formData.targetSystemInstanceId} options={instanceOptions} onChange={(value) => onChange('targetSystemInstanceId', value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <TextField label="방향" value={formData.directionCode} placeholder="outbound, inbound" onChange={(value) => onChange('directionCode', value)} />
        <TextField label="방식" value={formData.interfaceTypeCode} placeholder="API, EDI, batch" onChange={(value) => onChange('interfaceTypeCode', value)} />
        <TextField label="상태" value={formData.statusCode} placeholder="active" onChange={(value) => onChange('statusCode', value)} />
      </div>
      <TextField label="설명" value={formData.description} onChange={(value) => onChange('description', value)} />
      <TextField label="메모" value={formData.memo} onChange={(value) => onChange('memo', value)} />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}{required ? ' *' : ''}
      </label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const hasCurrentValue = Boolean(value) && !options.some((option) => option.value === value);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}{required ? ' *' : ''}
      </label>
      <Select value={value || NONE_VALUE} onValueChange={(nextValue) => onChange(nextValue === NONE_VALUE ? '' : nextValue)}>
        <SelectTrigger>
          <SelectValue placeholder="선택 안 함" />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>}
          {hasCurrentValue && <SelectItem value={value}>{value}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}{option.caption ? ` · ${option.caption}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RowActions({
  active,
  onEdit,
  onDeactivate,
}: {
  active: boolean;
  onEdit: () => void;
  onDeactivate: () => void | Promise<void>;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => void onDeactivate()}
        disabled={!active}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      'rounded px-2 py-0.5 text-xs font-medium',
      active ? 'bg-ssoo-success-bg text-ssoo-success' : 'bg-muted text-muted-foreground',
    )}>
      {active ? '활성' : '비활성'}
    </span>
  );
}

function ImportStatusBadge({ status }: { status: PmsMasterImportResponse['rows'][number]['status'] }) {
  const className = status === 'create'
    ? 'bg-ssoo-success-bg text-ssoo-success'
    : status === 'update'
      ? 'bg-ssoo-info-bg text-ssoo-info'
      : status === 'error'
        ? 'bg-ssoo-danger-bg text-ssoo-danger'
        : 'bg-muted text-muted-foreground';
  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', className)}>
      {status === 'create' ? '생성' : status === 'update' ? '갱신' : status === 'error' ? '오류' : '건너뜀'}
    </span>
  );
}

function isFormValid(tab: MasterTab, mode: FormMode, formData: MasterFormData) {
  const hasCode = mode === 'edit' || Boolean(requiredValue(formData.code));
  const hasName = Boolean(requiredValue(formData.name));
  if (tab === 'integrations') {
    return hasCode &&
      hasName &&
      Boolean(requiredValue(formData.sourceSystemInstanceId)) &&
      Boolean(requiredValue(formData.targetSystemInstanceId));
  }
  return hasCode && hasName;
}

function requiredValue(value: string) {
  return value.trim();
}

function optionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function nullableValue(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function formatValue(value: string | null | undefined) {
  return value && value.trim() ? value : '-';
}

function formatImportProfileHistoryLabel(history: PmsMasterImportProfileHistory) {
  return [
    `#${history.historySeq}`,
    formatImportProfileHistoryEvent(history.eventType),
    formatShortDateTime(history.eventAt),
    history.profileName,
    history.isDefault ? '기본' : null,
  ].filter(Boolean).join(' · ');
}

function formatImportProfileHistoryEvent(eventType: PmsMasterImportProfileHistory['eventType']) {
  if (eventType === 'C') return '생성';
  if (eventType === 'U') return '수정';
  return '삭제';
}

function formatShortDateTime(value: string) {
  return formatPmsShortDateTime(value, value);
}

function formatEntityType(entityType: PmsMasterImportResponse['rows'][number]['entityType']) {
  if (entityType === 'site') return '사이트';
  if (entityType === 'systemCatalog') return '시스템 종류';
  if (entityType === 'systemInstance') return '시스템';
  return '인터페이스';
}

function buildImportPayload({
  source,
  rawJson,
  entity,
  file,
  mapping,
}: {
  source: ImportSourceMode;
  rawJson: string;
  entity: ImportEntityKey;
  file: ParsedImportFile | null;
  mapping: ImportColumnMapping;
}): ImportPmsMasterRequest {
  if (source === 'json') {
    return parseImportPayload(rawJson);
  }
  if (!file || file.rows.length === 0) {
    throw new Error('반입할 CSV/TSV 파일을 선택해야 합니다.');
  }
  return mapDelimitedRowsToImportPayload(entity, file.rows, mapping);
}

function parseImportPayload(raw: string): ImportPmsMasterRequest {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error('JSON 객체 형식으로 입력해야 합니다.');
  }
  return parsed as ImportPmsMasterRequest;
}

function parseDelimitedImportFile(fileName: string, raw: string): ParsedImportFile {
  const rows = parseDelimitedRows(raw.replace(/^\uFEFF/, ''));
  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell.trim().length > 0));
  if (nonEmptyRows.length < 2) {
    throw new Error('헤더와 최소 1개 데이터 행이 필요합니다.');
  }

  const headers = normalizeImportHeaders(nonEmptyRows[0]);
  const dataRows = nonEmptyRows.slice(1).map((row) => (
    headers.reduce<ImportCsvRow>((record, header, index) => ({
      ...record,
      [header]: row[index]?.trim() ?? '',
    }), {})
  ));

  return {
    fileName,
    headers,
    rows: dataRows,
  };
}

function parseDelimitedRows(raw: string): string[][] {
  const delimiter = detectImportDelimiter(raw);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuote = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const nextChar = raw[index + 1];

    if (char === '"') {
      if (inQuote && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }

    if (char === delimiter && !inQuote) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuote) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function detectImportDelimiter(raw: string): ',' | '\t' {
  const sample = raw.split(/\r?\n/, 1)[0] ?? '';
  const commaCount = (sample.match(/,/g) ?? []).length;
  const tabCount = (sample.match(/\t/g) ?? []).length;
  return tabCount > commaCount ? '\t' : ',';
}

function normalizeImportHeaders(headers: string[]) {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header.trim() || `컬럼${index + 1}`;
    const seenCount = seen.get(base) ?? 0;
    seen.set(base, seenCount + 1);
    return seenCount === 0 ? base : `${base}_${seenCount + 1}`;
  });
}

function loadImportMappingProfiles(): Partial<Record<ImportEntityKey, ImportColumnMapping>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(IMPORT_MAPPING_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};

    return IMPORT_ENTITY_OPTIONS.reduce<Partial<Record<ImportEntityKey, ImportColumnMapping>>>((profiles, option) => {
      const storedMapping = parsed[option.key];
      if (!isRecord(storedMapping)) return profiles;
      const mapping = IMPORT_FIELD_CONFIGS[option.key].reduce<ImportColumnMapping>((record, field) => {
        const value = storedMapping[field.field];
        return {
          ...record,
          [field.field]: typeof value === 'string' && value ? value : NONE_VALUE,
        };
      }, {});

      return {
        ...profiles,
        [option.key]: mapping,
      };
    }, {});
  } catch {
    return {};
  }
}

function saveImportMappingProfiles(profiles: Partial<Record<ImportEntityKey, ImportColumnMapping>>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(IMPORT_MAPPING_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Local mapping reuse is a convenience only; import itself must remain usable.
  }
}

function inferImportColumnMapping(entity: ImportEntityKey, headers: string[]): ImportColumnMapping {
  return IMPORT_FIELD_CONFIGS[entity].reduce<ImportColumnMapping>((mapping, field) => ({
    ...mapping,
    [field.field]: findImportHeader(field, headers) ?? NONE_VALUE,
  }), {});
}

function resolveImportColumnMapping(
  entity: ImportEntityKey,
  headers: string[],
  profiles: Partial<Record<ImportEntityKey, ImportColumnMapping>>,
  sharedMapping?: ImportColumnMapping,
) {
  if (sharedMapping) {
    const reconciledSharedMapping = reconcileImportColumnMapping(entity, sharedMapping, headers);
    if (Object.values(reconciledSharedMapping).some(isMappedColumn)) {
      return reconciledSharedMapping;
    }
  }

  const savedMapping = profiles[entity];
  if (!savedMapping) return inferImportColumnMapping(entity, headers);

  const reconciled = reconcileImportColumnMapping(entity, savedMapping, headers);
  return Object.values(reconciled).some(isMappedColumn)
    ? reconciled
    : inferImportColumnMapping(entity, headers);
}

function reconcileImportColumnMapping(
  entity: ImportEntityKey,
  mapping: ImportColumnMapping,
  headers: string[],
): ImportColumnMapping {
  const headerSet = new Set(headers);
  return IMPORT_FIELD_CONFIGS[entity].reduce<ImportColumnMapping>((record, field) => {
    const header = mapping[field.field];
    return {
      ...record,
      [field.field]: isMappedColumn(header) && headerSet.has(header) ? header : NONE_VALUE,
    };
  }, {});
}

function compactImportColumnMapping(mapping: ImportColumnMapping): ImportColumnMapping {
  return Object.entries(mapping).reduce<ImportColumnMapping>((record, [field, header]) => (
    isMappedColumn(header)
      ? { ...record, [field]: header }
      : record
  ), {});
}

function findImportHeader(field: ImportFieldConfig, headers: string[]) {
  const aliases = field.aliases.map(normalizeImportColumnName);
  return headers.find((header) => aliases.includes(normalizeImportColumnName(header)));
}

function normalizeImportColumnName(value: string) {
  return value.trim().toLowerCase().replace(/[\s_\-./()[\]]/g, '');
}

function mapDelimitedRowsToImportPayload(
  entity: ImportEntityKey,
  rows: ImportCsvRow[],
  mapping: ImportColumnMapping,
): ImportPmsMasterRequest {
  const fields = IMPORT_FIELD_CONFIGS[entity];
  const missingRequiredFields = fields
    .filter((field) => field.required && !isMappedColumn(mapping[field.field]))
    .map((field) => field.label);
  if (missingRequiredFields.length > 0) {
    throw new Error(`필수 컬럼 매핑이 필요합니다: ${missingRequiredFields.join(', ')}`);
  }

  const mappedRows = rows.map((row, index) => {
    const mapped = fields.reduce<Record<string, string | boolean>>((record, field) => {
      const header = mapping[field.field];
      if (!isMappedColumn(header)) return record;
      const rawValue = row[header]?.trim() ?? '';
      if (!rawValue) return record;
      return {
        ...record,
        [field.field]: field.field === 'isActive'
          ? parseImportBoolean(rawValue, index + 2)
          : rawValue,
      };
    }, {});

    return mapped;
  });

  if (mappedRows.length === 0) {
    throw new Error('반입할 데이터 행이 없습니다.');
  }

  if (entity === 'sites') {
    return { sites: mappedRows as unknown as NonNullable<ImportPmsMasterRequest['sites']> };
  }
  if (entity === 'systemCatalogs') {
    return { systemCatalogs: mappedRows as unknown as NonNullable<ImportPmsMasterRequest['systemCatalogs']> };
  }
  if (entity === 'systemInstances') {
    return { systemInstances: mappedRows as unknown as NonNullable<ImportPmsMasterRequest['systemInstances']> };
  }
  return { integrations: mappedRows as unknown as NonNullable<ImportPmsMasterRequest['integrations']> };
}

function isMappedColumn(value: string | undefined) {
  return Boolean(value && value !== NONE_VALUE);
}

function parseImportBoolean(value: string, rowNumber: number) {
  const normalized = normalizeImportColumnName(value);
  if (['true', '1', 'y', 'yes', 'active', 'enabled', '활성', '사용'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'n', 'no', 'inactive', 'disabled', '비활성', '미사용'].includes(normalized)) {
    return false;
  }
  throw new Error(`${rowNumber}행의 활성 여부 값은 true/false, 활성/비활성 형식이어야 합니다.`);
}

function downloadImportTemplate(entity: ImportEntityKey) {
  if (typeof document === 'undefined') {
    throw new Error('브라우저에서만 템플릿을 다운로드할 수 있습니다.');
  }

  const headers = getImportTemplateFields(entity).map((field) => field.field);
  const sampleRow = headers.map((header) => IMPORT_TEMPLATE_SAMPLE_ROWS[entity][header] ?? '');
  const csv = [headers, sampleRow]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}\n`], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `pms-master-${entity}-template.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
