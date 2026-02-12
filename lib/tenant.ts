export interface TenantConfig {
  name: string;
  productName: string;
  supportEmail: string;
  website: string;
}

const DEFAULT_TENANT: TenantConfig = {
  name: "TestFlow 工作室",
  productName: "TestFlow V1",
  supportEmail: "service@testflow.local",
  website: "https://testflow.local"
};

export function getTenantConfig(): TenantConfig {
  return DEFAULT_TENANT;
}
