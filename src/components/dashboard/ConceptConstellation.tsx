import { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d'
import { useConceptGraph } from '../../hooks/useConceptGraph'

interface ConceptConstellationProps {
  graphData: ConceptGraphData
  onOpenDocument: (filepath: string) => void
}

export default function ConceptConstellation({
  onOpenDocument,
}: ConceptConstellationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<ForceGraphMethods<any, any> | undefined>(undefined)
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 })

  const {
    nodes,
    links,
    selectedConcept,
    selectedNode,
    relatedDocuments,
    selectConcept,
  } = useConceptGraph()

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Zoom to fit on data change
  useEffect(() => {
    if (graphRef.current && nodes.length > 0) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50)
      }, 500)
    }
  }, [nodes.length])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = useCallback((node: any) => {
    if (node.id) {
      selectConcept(selectedConcept === node.id ? null : String(node.id))
    }
  }, [selectedConcept, selectConcept])

  const handleBackgroundClick = useCallback(() => {
    selectConcept(null)
  }, [selectConcept])

  // Handle opening a document from the concept details
  const handleDocumentClick = useCallback((_documentId: string) => {
    // We'd need to fetch the document filepath - for now this is a placeholder
    // Could be enhanced to fetch document details and call onOpenDocument
  }, [onOpenDocument])

  if (nodes.length === 0) {
    return (
      <div className="constellation-container h-full flex items-center justify-center">
        <div className="text-center p-8">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <p className="text-gray-500 text-sm">
            Concepts will appear as you explore documents
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="constellation-container h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800/50">
        <h3 className="text-white font-medium text-sm">Concept Map</h3>
        <span className="text-gray-500 text-xs">{nodes.length} concepts</span>
      </div>

      {/* Graph container */}
      <div ref={containerRef} className="flex-1 relative">
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={{ nodes, links }}
          nodeLabel="name"
          nodeColor={(node: { color?: string; id?: string }) =>
            selectedConcept && node.id !== selectedConcept
              ? 'rgba(100, 100, 100, 0.3)'
              : node.color || '#6366F1'
          }
          nodeVal="val"
          linkColor={() => 'rgba(100, 100, 100, 0.2)'}
          linkWidth={(link: { value?: number }) => Math.sqrt(link.value || 1) * 0.5}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          backgroundColor="transparent"
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = (node as { name?: string }).name || ''
            const fontSize = Math.max(10, 12 / globalScale)
            const nodeSize = (node as { val?: number }).val || 5
            const isSelected = selectedConcept === node.id
            const isDimmed = selectedConcept && !isSelected

            // Draw node circle
            ctx.beginPath()
            ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI)
            ctx.fillStyle = isDimmed
              ? 'rgba(100, 100, 100, 0.3)'
              : ((node as { color?: string }).color || '#6366F1')
            ctx.fill()

            // Draw selection ring
            if (isSelected) {
              ctx.strokeStyle = '#ffffff'
              ctx.lineWidth = 2 / globalScale
              ctx.stroke()
            }

            // Draw label
            if (globalScale > 0.5 || isSelected) {
              ctx.font = `${fontSize}px Inter, sans-serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = isDimmed ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)'
              ctx.fillText(label, node.x || 0, (node.y || 0) + nodeSize + fontSize)
            }
          }}
        />

        {/* Selected concept details */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 right-3 bg-zinc-900/95 rounded-lg p-3 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium">{selectedNode.name}</h4>
              <button
                onClick={() => selectConcept(null)}
                className="text-gray-500 hover:text-white p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {relatedDocuments.length > 0 && (
              <div className="space-y-1">
                <p className="text-gray-500 text-xs mb-1">Found in:</p>
                {relatedDocuments.map((doc) => (
                  <button
                    key={doc.document_id}
                    className="w-full text-left text-xs text-gray-300 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors truncate"
                    onClick={() => handleDocumentClick(doc.document_id)}
                  >
                    {doc.filename} ({doc.occurrence_count}x)
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
