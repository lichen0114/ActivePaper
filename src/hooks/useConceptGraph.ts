import { useState, useEffect, useCallback, useMemo } from 'react'

interface ConceptNode {
  id: string
  name: string
  val: number // Size based on occurrences
  color: string
}

interface ConceptLink {
  source: string
  target: string
  value: number
}

interface UseConceptGraphState {
  nodes: ConceptNode[]
  links: ConceptLink[]
  selectedConcept: string | null
  relatedDocuments: Array<{ document_id: string; filename: string; occurrence_count: number }>
  isLoading: boolean
  error: string | null
}

// Color palette for concepts
const COLORS = {
  emerald: '#10B981',
  rose: '#F43F5E',
  indigo: '#6366F1',
  amber: '#F59E0B',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
}

function getColorForConcept(documentCount: number): string {
  // More connected concepts get warmer colors
  if (documentCount > 3) return COLORS.rose
  if (documentCount > 2) return COLORS.amber
  if (documentCount > 1) return COLORS.indigo
  return COLORS.emerald
}

export function useConceptGraph() {
  const [state, setState] = useState<UseConceptGraphState>({
    nodes: [],
    links: [],
    selectedConcept: null,
    relatedDocuments: [],
    isLoading: true,
    error: null,
  })

  const loadGraph = useCallback(async () => {
    if (!window.api) return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const graphData = await window.api.getConceptGraph()

      const nodes: ConceptNode[] = graphData.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        val: Math.max(3, Math.min(15, (node.total_occurrences || 1) * 2)),
        color: getColorForConcept(node.document_count || 1),
      }))

      const links: ConceptLink[] = graphData.links.map(link => ({
        source: link.source,
        target: link.target,
        value: link.weight,
      }))

      setState(prev => ({
        ...prev,
        nodes,
        links,
        isLoading: false,
        error: null,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load concept graph',
      }))
    }
  }, [])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  const selectConcept = useCallback(async (conceptId: string | null) => {
    if (!window.api) return

    setState(prev => ({ ...prev, selectedConcept: conceptId }))

    if (conceptId) {
      try {
        const documents = await window.api.getDocumentsForConcept(conceptId)
        setState(prev => ({ ...prev, relatedDocuments: documents }))
      } catch (err) {
        console.error('Failed to load related documents:', err)
      }
    } else {
      setState(prev => ({ ...prev, relatedDocuments: [] }))
    }
  }, [])

  const selectedNode = useMemo(() => {
    return state.nodes.find(n => n.id === state.selectedConcept)
  }, [state.nodes, state.selectedConcept])

  return {
    ...state,
    selectedNode,
    selectConcept,
    refresh: loadGraph,
  }
}
