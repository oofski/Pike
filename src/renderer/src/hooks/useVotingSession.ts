import { useQuery } from '@tanstack/react-query'
import { api, type VotingSessionResponse } from '@/lib/api'
import { qk } from '@/lib/queryKeys'

/**
 * Poll the active voting session every 2s. Shared by the Bid Room admin view,
 * the projector big-screen view, and the brother voting view so they stay in sync.
 */
export function useVotingSession(): ReturnType<typeof useQuery<VotingSessionResponse>> {
  return useQuery({
    queryKey: qk.votingSession,
    queryFn: api.voting.session,
    refetchInterval: 2000,
    refetchIntervalInBackground: true
  })
}
