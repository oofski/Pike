import { useNavigate } from 'react-router-dom'

export default function VotingPresentPage(): JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="app-bg flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-5xl font-bold text-ink-50">Bid Room — Big Screen</h1>
      <p className="text-ink-400">Projector mode is being assembled…</p>
      <button className="btn-ghost" onClick={() => navigate('/voting')}>
        Exit
      </button>
    </div>
  )
}
