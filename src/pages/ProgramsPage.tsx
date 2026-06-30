import { type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { ProgramItem } from '../types'
import { SortableProgramRow } from '../components'

type Props = {
  selectedPreset: number
  programs: ProgramItem[]
  presetPrograms: ProgramItem[]
  openMenuId: string | null
  onSetSelectedPreset: (preset: number) => void
  onSetIsAddModalOpen: (open: boolean) => void
  onSetOpenMenuId: (id: string | null | ((prev: string | null) => string | null)) => void
  onToggleProgram: (id: string) => void
  onDeleteProgram: (id: string) => void
  onDragEnd: (event: DragEndEvent) => void
}

export function ProgramsPage({
  selectedPreset, presetPrograms, openMenuId,
  onSetSelectedPreset, onSetIsAddModalOpen, onSetOpenMenuId,
  onToggleProgram, onDeleteProgram, onDragEnd,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  return (
    <section className="programs-page">
      <div className="page-header">
        <div>
          <h1>Programs</h1>
          <p>Add or remove programs to customize your MN WORKSPACE.</p>
        </div>
        <button className="add-program-button" onClick={() => onSetIsAddModalOpen(true)}>
          ＋ Add Program
        </button>
      </div>

      <div className="program-list-card" onClick={(e) => e.stopPropagation()}>
        <div className="program-list-header">
          <div className="preset-header">
            <span className="preset-title">Preset</span>
            <div className="preset-tabs" style={{ '--selected-preset-index': selectedPreset - 1 } as CSSProperties}>
              <span className="preset-active-dot"></span>
              {[1, 2, 3, 4].map((n) => (
                <div className="preset-tab-wrap" key={n}>
                  <button
                    className={`preset-tab ${selectedPreset === n ? 'active' : ''}`}
                    onClick={() => onSetSelectedPreset(n)}
                  >
                    {String(n).padStart(2, '0')}
                  </button>
                  {n !== 4 && <span className="preset-tab-divider"></span>}
                </div>
              ))}
            </div>
          </div>
          <div className="program-list-meta">
            <strong>Program List ({presetPrograms.length})</strong>
            <span>⠿ Drag to reorder</span>
          </div>
        </div>

        <DndContext
          key={selectedPreset}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={presetPrograms.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence>
              {presetPrograms.map((program, index) => (
                <motion.div
                  key={`${selectedPreset}-${program.id}`}
                  className="program-list-motion-row"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.28, delay: index * 0.045, ease: [0.2, 0.9, 0.3, 1] }}
                >
                  <SortableProgramRow
                    program={program}
                    isMenuOpen={openMenuId === program.id}
                    onToggle={onToggleProgram}
                    onMenuToggle={(id) => onSetOpenMenuId((prev) => (prev === id ? null : id))}
                    onDelete={onDeleteProgram}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      </div>

      <div className="save-note">ⓘ Changes are saved automatically.</div>
    </section>
  )
}
