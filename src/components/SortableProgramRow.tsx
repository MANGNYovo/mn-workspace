import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ProgramItem } from '../types'
import { ProgramIcon } from './ProgramIcon'

type Props = {
  program: ProgramItem
  isMenuOpen: boolean
  onToggle: (id: string) => void
  onMenuToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function SortableProgramRow({
  program,
  isMenuOpen,
  onToggle,
  onMenuToggle,
  onDelete,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: program.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      className={`program-list-row ${isDragging ? 'dragging' : ''}`}
      style={style}
    >
      <button className="drag-handle" {...attributes} {...listeners}>
        ⠿
      </button>

      <ProgramIcon program={program} />

      <div className="program-info">
        <h3>{program.name}</h3>
        <p>{program.path}</p>
      </div>

      <button
        className={`toggle ${program.enabled ? 'on' : ''}`}
        onClick={() => onToggle(program.id)}
      >
        <span></span>
      </button>

      <div className="row-menu-wrap">
        <button className="more-button" onClick={() => onMenuToggle(program.id)}>
          •••
        </button>

        {isMenuOpen && (
          <div className="row-menu">
            <button onClick={() => onDelete(program.id)}>Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}
