import { Link } from 'react-router-dom'
import { company } from '../config/company'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${company.companyName} home`}>
      {company.logo ? (
        <img src={company.logo} alt="" className="h-8 w-8" />
      ) : (
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"><path d="M6 19V5l12 14V5" /></svg>
        </span>
      )}
      <span className={`font-display text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        {company.companyName.split(' ')[0]}
        <span className={light ? 'text-slate-400' : 'text-slate-500'}> {company.companyName.split(' ').slice(1).join(' ')}</span>
      </span>
    </Link>
  )
}
