'use client'
import { useState } from 'react'
import { ChevronRight, ChevronDown, Tag as TagIcon } from 'lucide-react'

export default function TagBrowser({ tags, onTagSelect }) {
  const [expanded, setExpanded] = useState(new Set(['Oven', 'Tank']))

  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.group]) acc[tag.group] = []
    acc[tag.group].push(tag)
    return acc
  }, {})

  const toggleGroup = (group) => {
    setExpanded(prev => {
      const newSet = new Set(prev)
      if (newSet.has(group)) newSet.delete(group)
      else newSet.add(group)
      return newSet
    })
  }

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.3)',
      maxHeight: '30vh',
      overflow: 'auto'
    }}>
      <div style={{
        padding: '1rem 1rem 0.5rem 1rem',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        color: '#fbbf24'
      }}>
        TAG BROWSER
      </div>
      
      <div style={{ padding: '0 1rem 1rem 1rem' }}>
        {Object.entries(groupedTags).map(([group, groupTags]) => (
          <div key={group} style={{ marginBottom: '0.5rem' }}>
            <div
              onClick={() => toggleGroup(group)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              {expanded.has(group) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span style={{ fontWeight: 'bold' }}>{group}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>
                ({groupTags.length})
              </span>
            </div>
            
            {expanded.has(group) && (
              <div style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                {groupTags.map(tag => (
                  <div
                    key={tag.id}
                    onClick={() => onTagSelect?.(tag)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.3rem 0.5rem',
                      fontSize: '0.65rem',
                      cursor: 'pointer',
                      borderRadius: '3px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <TagIcon size={12} color={tag.dataType === 'Boolean' ? '#10b981' : '#00d4ff'} />
                    <span>{tag.name}</span>
                    {tag.unit && <span style={{ color: 'var(--text-tertiary)' }}>({tag.unit})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
