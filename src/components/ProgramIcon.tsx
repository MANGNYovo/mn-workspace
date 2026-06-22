import type { ProgramItem } from '../types'

type Props = {
  program: ProgramItem
}

export function ProgramIcon({ program }: Props) {
  if (program.iconImage) {
    return (
      <img
        src={program.iconImage}
        alt=""
        className="program-real-icon"
      />
    )
  }

  return <div className={`icon ${program.iconClass}`}>{program.icon}</div>
}
