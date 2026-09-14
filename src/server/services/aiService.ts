export function logCostMetric(endpoint: string, uid: string | undefined, ip: string, inputLength: number, success: boolean) {
  const timestamp = new Date().toISOString();
  console.log(`[AI Cost Log] ${timestamp} | Endpoint: ${endpoint} | User: ${uid || ip} | InputLen: ${inputLength} | Success: ${success}`);
}
