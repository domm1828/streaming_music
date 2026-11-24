import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@stream-music/shared';
import { apiClient } from '../../lib/api-client';

export interface HealthStatus {
  status: string;
  service: string;
  uptime: number;
  database: string;
  timestamp: string;
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<HealthStatus>>('health');
      return data.data;
    },
  });
}
