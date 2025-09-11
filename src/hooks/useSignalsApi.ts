'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';
import { createAuthenticatedQueryFn, createAuthenticatedMutationFn } from '@/lib/queryClient';
import { useGlobalNotifications } from '@/app/providers';

// Types
interface Signal {
  id: string;
  name: string;
  question: string;
  answerOptions: string[];
  voteCount: number;
  runFrequency: string;
  isPublic: boolean;
  active: boolean;
  createdAt: string;
  createdBy?: string;
  creatorEmail?: string;
  _count: {
    signalRuns: number;
  };
}

interface Response {
  [option: string]: number;
}

interface Percentages {
  [option: string]: number;
}

interface Run {
  id: string;
  status?: string;
  startedAt: string;
  completedAt: string;
  rapidataOrderId: string;
  totalVotes: number;
  responses: Response;
  percentages: Percentages;
}

interface SignalDetail extends Signal {
  countries?: string[];
  runs: Run[];
}

interface CreateSignalData {
  name: string;
  question: string;
  answerOptions: string[];
  voteCount: number;
  runFrequency: string;
  createdBy: string;
  userEmail: string;
  isPublic?: boolean;
  countries?: string[];
}

// Query Keys - centralized for easy cache management
export const signalKeys = {
  all: ['signals'] as const,
  lists: () => [...signalKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) => [...signalKeys.lists(), filters] as const,
  details: () => [...signalKeys.all, 'detail'] as const,
  detail: (id: string) => [...signalKeys.details(), id] as const,
};

// Custom hook to get authenticated query and mutation functions
const useAuthenticatedApi = () => {
  const auth = useAuth();
  
  const queryFn = createAuthenticatedQueryFn(
    () => auth.user || null,
    async () => {
      const result = await auth.signinSilent();
      return result || undefined;
    }
  );
  
  const mutationFn = createAuthenticatedMutationFn(
    () => auth.user || null,
    async () => {
      const result = await auth.signinSilent();
      return result || undefined;
    }
  );
  
  return { queryFn, mutationFn };
};

// Query Hooks

/**
 * Get all signals with caching
 */
export const useSignals = () => {
  const { queryFn } = useAuthenticatedApi();
  
  return useQuery({
    queryKey: signalKeys.list(),
    queryFn: ({ signal }) => queryFn({ 
      queryKey: ['/api/signals'], 
      signal 
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get single signal with details
 */
export const useSignal = (signalId: string) => {
  const { queryFn } = useAuthenticatedApi();
  
  return useQuery({
    queryKey: signalKeys.detail(signalId),
    queryFn: ({ signal }) => queryFn({ 
      queryKey: [`/api/signals/${signalId}/details`], 
      signal 
    }),
    enabled: !!signalId, // Only run query if signalId exists
    staleTime: 2 * 60 * 1000, // 2 minutes (fresher for details)
  });
};

// Public (unauthenticated) queries
export const usePublicSignals = () => {
  return useQuery({
    queryKey: signalKeys.list({ public: true }),
    queryFn: async () => {
      const res = await fetch('/api/public/signals');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const usePublicSignal = (signalId: string) => {
  return useQuery({
    queryKey: signalKeys.detail(`public-${signalId}`),
    queryFn: async () => {
      const res = await fetch(`/api/public/signals/${signalId}/details`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!signalId,
    staleTime: 2 * 60 * 1000,
  });
};

// Mutation Hooks

/**
 * Create a new signal
 */
export const useCreateSignal = () => {
  const { mutationFn } = useAuthenticatedApi();
  const { showSuccess, showError } = useGlobalNotifications();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateSignalData) => mutationFn({
      url: '/api/signals',
      method: 'POST',
      body: data,
    }),
    onSuccess: () => {
      showSuccess('Signal created successfully!');
      // Invalidate signals list to refetch
      queryClient.invalidateQueries({ queryKey: signalKeys.lists() });
    },
    onError: (error: Error) => {
      showError(`Failed to create signal: ${error.message}`);
    },
  });
};

/**
 * Update signal status (active/inactive)
 */
export const useUpdateSignalStatus = () => {
  const { mutationFn } = useAuthenticatedApi();
  const { showError } = useGlobalNotifications();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ signalId, active }: { signalId: string; active: boolean }) => mutationFn({
      url: `/api/signals/${signalId}`,
      method: 'PATCH',
      body: { active },
    }),
    onMutate: async ({ signalId, active }) => {
      // Cancel outgoing queries for signals list
      await queryClient.cancelQueries({ queryKey: signalKeys.lists() });
      
      // Snapshot the previous value
      const previousSignals = queryClient.getQueryData<Signal[]>(signalKeys.list());
      
      // Optimistically update the cache
      queryClient.setQueryData<Signal[]>(signalKeys.list(), (old) => 
        old?.map(signal => 
          signal.id === signalId 
            ? { ...signal, active }
            : signal
        )
      );
      
      // Also update individual signal cache if it exists
      queryClient.setQueryData<SignalDetail>(signalKeys.detail(signalId), (old) =>
        old ? { ...old, active } : old
      );
      
      return { previousSignals };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousSignals) {
        queryClient.setQueryData(signalKeys.list(), context.previousSignals);
      }
      showError(`Failed to update signal status: ${error.message}`);
    },
    onSettled: (data, error, { signalId }) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: signalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: signalKeys.detail(signalId) });
    },
  });
};

/**
 * Update signal visibility (public/private) — admin only
 */
export const useUpdateSignalVisibility = () => {
  const { mutationFn } = useAuthenticatedApi();
  const { showError } = useGlobalNotifications();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ signalId, isPublic }: { signalId: string; isPublic: boolean }) => mutationFn({
      url: `/api/signals/${signalId}`,
      method: 'PATCH',
      body: { isPublic },
    }),
    onMutate: async ({ signalId, isPublic }) => {
      await queryClient.cancelQueries({ queryKey: signalKeys.lists() });
      const previousSignals = queryClient.getQueryData<Signal[]>(signalKeys.list());

      // Optimistic update in list
      queryClient.setQueryData<Signal[]>(signalKeys.list(), (old) =>
        old?.map(signal => signal.id === signalId ? { ...signal, isPublic } : signal)
      );

      // Optimistic update in detail
      queryClient.setQueryData<SignalDetail>(signalKeys.detail(signalId), (old) =>
        old ? { ...old, isPublic } : old
      );
      
      return { previousSignals };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousSignals) {
        queryClient.setQueryData(signalKeys.list(), context.previousSignals);
      }
      showError(`Failed to update visibility: ${error.message}`);
    },
    onSettled: (_data, _error, { signalId }) => {
      queryClient.invalidateQueries({ queryKey: signalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: signalKeys.detail(signalId) });
    },
  });
};

/**
 * Update signal run settings (runFrequency, voteCount)
 */
export const useUpdateSignalSettings = () => {
  const { mutationFn } = useAuthenticatedApi();
  const { showSuccess, showError } = useGlobalNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ signalId, runFrequency, voteCount }: { signalId: string; runFrequency: string; voteCount: number }) => mutationFn({
      url: `/api/signals/${signalId}`,
      method: 'PATCH',
      body: { runFrequency, voteCount },
    }),
    onMutate: async ({ signalId, runFrequency, voteCount }) => {
      await queryClient.cancelQueries({ queryKey: signalKeys.detail(signalId) });
      const previous = queryClient.getQueryData<SignalDetail>(signalKeys.detail(signalId));
      // Optimistic update in details
      queryClient.setQueryData<SignalDetail>(signalKeys.detail(signalId), (old) => (
        old ? { ...old, runFrequency, voteCount } : old
      ));
      // Also update in lists
      queryClient.setQueryData<Signal[]>(signalKeys.list(), (old) => (
        old?.map(s => s.id === signalId ? { ...s, runFrequency, voteCount } as Signal : s)
      ));
      return { previous };
    },
    onSuccess: () => {
      showSuccess('Run settings updated');
    },
    onError: (error: Error, { signalId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(signalKeys.detail(signalId), context.previous);
      }
      showError(`Failed to update run settings: ${error.message}`);
    },
    onSettled: (_data, _error, { signalId }) => {
      queryClient.invalidateQueries({ queryKey: signalKeys.detail(signalId) });
      queryClient.invalidateQueries({ queryKey: signalKeys.lists() });
    },
  });
};

/**
 * Update signal countries filter — admin only
 */
export const useUpdateSignalCountries = () => {
  const { mutationFn } = useAuthenticatedApi();
  const { showError } = useGlobalNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ signalId, countries }: { signalId: string; countries: string[] | null }) => mutationFn({
      url: `/api/signals/${signalId}`,
      method: 'PATCH',
      body: { countries },
    }),
    onMutate: async ({ signalId, countries }) => {
      await queryClient.cancelQueries({ queryKey: signalKeys.detail(signalId) });
      const previous = queryClient.getQueryData<SignalDetail>(signalKeys.detail(signalId));
      queryClient.setQueryData<SignalDetail>(signalKeys.detail(signalId), (old) => (
        old ? { ...old, countries: countries ?? undefined } : old
      ));
      return { previous };
    },
    onError: (error: Error, { signalId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(signalKeys.detail(signalId), context.previous);
      }
      showError(`Failed to update countries: ${error.message}`);
    },
    onSettled: (_data, _error, { signalId }) => {
      queryClient.invalidateQueries({ queryKey: signalKeys.detail(signalId) });
      queryClient.invalidateQueries({ queryKey: signalKeys.lists() });
    },
  });
};

/**
 * Execute a signal
 */
export const useExecuteSignal = () => {
  const { mutationFn } = useAuthenticatedApi();
  const { showSuccess, showError } = useGlobalNotifications();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (signalId: string) => mutationFn({
      url: '/api/signals/execute',
      method: 'POST',
      body: { signalId },
    }),
    onSuccess: (data, signalId) => {
      showSuccess(`Signal executed successfully! Run ID: ${data.signalRunId}`);
      // Refetch signal details after a delay to show new run
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: signalKeys.detail(signalId) });
      }, 2000);
    },
    onError: (error: Error) => {
      showError(`Failed to execute signal: ${error.message}`);
    },
  });
};

/**
 * Delete a signal
 */
export const useDeleteSignal = () => {
  const { mutationFn } = useAuthenticatedApi();
  const { showSuccess, showError } = useGlobalNotifications();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (signalId: string) => mutationFn({
      url: `/api/signals/${signalId}`,
      method: 'DELETE',
    }),
    onSuccess: (data, signalId) => {
      showSuccess('Signal deleted successfully!');
      // Remove from cache and refetch list
      queryClient.removeQueries({ queryKey: signalKeys.detail(signalId) });
      queryClient.invalidateQueries({ queryKey: signalKeys.lists() });
    },
    onError: (error: Error) => {
      showError(`Failed to delete signal: ${error.message}`);
    },
  });
};

/**
 * Delete a signal run
 */
export const useDeleteRun = () => {
  const { mutationFn } = useAuthenticatedApi();
  const { showSuccess, showError } = useGlobalNotifications();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ signalId, runId }: { signalId: string; runId: string }) => mutationFn({
      url: `/api/signals/${signalId}/runs/${runId}`,
      method: 'DELETE',
    }),
    onSuccess: (data, { signalId }) => {
      showSuccess('Run deleted successfully!');
      // Refetch signal details to update runs list
      queryClient.invalidateQueries({ queryKey: signalKeys.detail(signalId) });
    },
    onError: (error: Error) => {
      showError(`Failed to delete run: ${error.message}`);
    },
  });
};
