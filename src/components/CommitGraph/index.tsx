import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import type { Commit } from '@/types';

// 10-color palette for commit graph lanes
const GRAPH_COLORS = [
  '#89b4fa', // blue
  '#a6e3a1', // green
  '#f38ba8', // red
  '#f9e2af', // yellow
  '#fab387', // peach
  '#cba6f7', // mauve
  '#94e2d5', // teal
  '#f5c2e7', // pink
  '#b4befe', // lavender
  '#74c7ec', // sapphire
];

interface GraphNode {
  commit: Commit;
  lane: number;
  color: string;
  nodeType: 'default' | 'head' | 'merge';
}

interface CommitGraphProps {
  commits: Commit[];
  selectedCommitId: string | null;
  onCommitClick: (commitId: string) => void;
  onDragCommit?: (sourceSha: string, targetBranch: string, operation: 'cherry-pick' | 'merge') => void;
  rowHeight?: number;
  nodeRadius?: number;
  className?: string;
}

const ROW_HEIGHT = 40;
const NODE_RADIUS = 6;
const LANE_WIDTH = 24;
const PADDING_LEFT = 16;

/** Parse the refs string from backend into structured refs */
function parseRefs(refsStr: string): { name: string; kind: string }[] {
  if (!refsStr) return [];
  try {
    return JSON.parse(refsStr) as { name: string; kind: string }[];
  } catch {
    return [];
  }
}

/** Collect unique branch names from all commits */
function collectBranches(commits: Commit[]): { name: string; kind: string }[] {
  const branchMap = new Map<string, string>();
  for (const commit of commits) {
    const refs = parseRefs(commit.refs);
    for (const ref of refs) {
      if (ref.kind === 'branch' || ref.kind === 'head') {
        branchMap.set(ref.name, ref.kind);
      }
    }
  }
  return Array.from(branchMap.entries()).map(([name, kind]) => ({ name, kind }));
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  selectedCommitId,
  onCommitClick,
  onDragCommit,
  rowHeight = ROW_HEIGHT,
  nodeRadius = NODE_RADIUS,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<number>(0);
  const visibleRangeRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const rafRef = useRef<number>(0);
  const [dragOverBranch, setDragOverBranch] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Pre-build sha -> index map for O(1) lookup instead of findIndex O(n)
  const shaIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < commits.length; i++) {
      map.set(commits[i].sha, i);
    }
    return map;
  }, [commits]);

  // Assign lanes to commits using a simple lane assignment algorithm
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const activeLanes: Map<string, number> = new Map();
    let nextLane = 0;

    for (const commit of commits) {
      // Free lanes from parents that are not in the commit list anymore
      const parentsInList = commit.parents.filter((p) =>
        commits.some((c) => c.sha === p)
      );

      // Check if this commit's SHA is in any active lane
      let lane = activeLanes.get(commit.sha);

      if (lane === undefined) {
        // Assign to first available lane
        lane = nextLane;
        nextLane++;
      }

      // Determine node type
      const refs = parseRefs(commit.refs);
      const isHead = refs.some((r) => r.kind === 'head');
      const isMerge = commit.parents.length > 1;

      nodes.push({
        commit,
        lane,
        color: GRAPH_COLORS[lane % GRAPH_COLORS.length],
        nodeType: isHead ? 'head' : isMerge ? 'merge' : 'default',
      });

      // Remove this commit's lane from active
      activeLanes.delete(commit.sha);

      // Add parent lanes
      for (const parent of parentsInList) {
        if (!activeLanes.has(parent)) {
          activeLanes.set(parent, lane);
        }
      }
    }

    return { nodes, maxLanes: nextLane };
  }, [commits]);

  const totalHeight = commits.length * rowHeight;
  const graphWidth = graphData.maxLanes * LANE_WIDTH + PADDING_LEFT * 2;

  // Collect branch labels for drop targets
  const branches = useMemo(() => collectBranches(commits), [commits]);

  const drawGraph = useCallback(
    (startIdx: number, endIdx: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Clear
      ctx.clearRect(0, 0, rect.width, rect.height);

      const { nodes } = graphData;
      const visibleNodes = nodes.slice(startIdx, endIdx);

      // Draw connections (bezier curves) - using shaIndexMap for O(1) parent lookup
      for (let i = startIdx; i < endIdx; i++) {
        const node = nodes[i];
        const x = PADDING_LEFT + node.lane * LANE_WIDTH + LANE_WIDTH / 2;
        const y = (i - startIdx) * rowHeight + rowHeight / 2;

        for (const parentId of node.commit.parents) {
          const parentIdx = shaIndexMap.get(parentId);
          if (parentIdx === undefined || parentIdx < 0 || parentIdx >= commits.length) continue;

          const parentNode = nodes[parentIdx];
          if (!parentNode) continue;

          const px = PADDING_LEFT + parentNode.lane * LANE_WIDTH + LANE_WIDTH / 2;
          const py = (parentIdx - startIdx) * rowHeight + rowHeight / 2;

          // Only draw if parent is visible
          if (parentIdx >= startIdx && parentIdx < endIdx) {
            ctx.beginPath();
            ctx.strokeStyle = node.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;

            const midY = (y + py) / 2;
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x, midY, px, midY, px, py);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < visibleNodes.length; i++) {
        const node = visibleNodes[i];
        const x = PADDING_LEFT + node.lane * LANE_WIDTH + LANE_WIDTH / 2;
        const y = i * rowHeight + rowHeight / 2;
        const isSelected = node.commit.sha === selectedCommitId;

        if (node.nodeType === 'head') {
          // Double circle for HEAD
          ctx.beginPath();
          ctx.arc(x, y, nodeRadius + 2, 0, Math.PI * 2);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, nodeRadius - 1, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();
        } else if (node.nodeType === 'merge') {
          // Cross/plus for merge commits
          ctx.beginPath();
          ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();

          ctx.beginPath();
          ctx.strokeStyle = '#1e1e2e';
          ctx.lineWidth = 2;
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x + 3, y);
          ctx.moveTo(x, y - 3);
          ctx.lineTo(x, y + 3);
          ctx.stroke();
        } else {
          // Default: filled circle
          ctx.beginPath();
          ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();
        }

        // Selection ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, nodeRadius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#cdd6f4';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    },
    [graphData, selectedCommitId, rowHeight, nodeRadius, commits, shaIndexMap]
  );

  // Handle scroll and resize with requestAnimationFrame throttling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      scrollRef.current = container.scrollTop;
      const startIdx = Math.floor(container.scrollTop / rowHeight);
      const endIdx = Math.min(startIdx + Math.ceil(container.clientHeight / rowHeight) + 1, commits.length);
      visibleRangeRef.current = { start: startIdx, end: endIdx };

      // Throttle with requestAnimationFrame
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        drawGraph(startIdx, endIdx);
      });
    };

    const handleResize = () => {
      const { start, end } = visibleRangeRef.current;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        drawGraph(start, end);
      });
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    // Initial draw
    const startIdx = 0;
    const endIdx = Math.min(Math.ceil(container.clientHeight / rowHeight) + 1, commits.length);
    visibleRangeRef.current = { start: startIdx, end: endIdx };
    drawGraph(startIdx, endIdx);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawGraph, commits.length, rowHeight]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top + scrollRef.current;
      const idx = Math.floor(y / rowHeight);

      if (idx >= 0 && idx < commits.length) {
        onCommitClick(commits[idx].sha);
      }
    },
    [commits, onCommitClick, rowHeight]
  );

  // Drag handlers for commit nodes
  const handleDragStart = useCallback(
    (e: React.DragEvent, sha: string) => {
      setIsDragging(true);
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'commit', sha }));
      e.dataTransfer.effectAllowed = 'copy';
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleBranchDragOver = useCallback((e: React.DragEvent, branchName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverBranch(branchName);
  }, []);

  const handleBranchDragLeave = useCallback(() => {
    setDragOverBranch(null);
  }, []);

  const handleBranchDrop = useCallback(
    (e: React.DragEvent, branchName: string) => {
      e.preventDefault();
      setDragOverBranch(null);
      setIsDragging(false);
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'commit' && data.sha && onDragCommit) {
          onDragCommit(data.sha, branchName, 'cherry-pick');
        }
      } catch {
        // Ignore invalid drag data
      }
    },
    [onDragCommit]
  );

  // Find the commit index for a given branch (first commit that has this branch ref)
  const getBranchCommitIndex = useCallback(
    (branchName: string) => {
      return commits.findIndex((c) => {
        const refs = parseRefs(c.refs);
        return refs.some((r) => r.name === branchName && (r.kind === 'branch' || r.kind === 'head'));
      });
    },
    [commits]
  );

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto overflow-x-hidden relative ${className}`}
      style={{ height: totalHeight }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: graphWidth,
          height: totalHeight,
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'auto',
        }}
      />

      {/* Invisible draggable overlay for commit nodes - only render during drag */}
      {isDragging && graphData.nodes.map((node, idx) => {
        const x = PADDING_LEFT + node.lane * LANE_WIDTH + LANE_WIDTH / 2;
        const y = idx * rowHeight + rowHeight / 2;
        const hitSize = (nodeRadius + 6) * 2;
        return (
          <div
            key={node.commit.sha}
            draggable
            onDragStart={(e) => handleDragStart(e, node.commit.sha)}
            onDragEnd={handleDragEnd}
            style={{
              position: 'absolute',
              left: x - hitSize / 2,
              top: y - hitSize / 2,
              width: hitSize,
              height: hitSize,
              cursor: 'grab',
              zIndex: 10,
              borderRadius: '50%',
            }}
            title={`Drag to cherry-pick ${node.commit.sha.slice(0, 7)}`}
          />
        );
      })}

      {/* Branch drop targets */}
      {branches.map((branch) => {
        const commitIdx = getBranchCommitIndex(branch.name);
        if (commitIdx < 0) return null;
        const node = graphData.nodes[commitIdx];
        if (!node) return null;

        const x = PADDING_LEFT + node.lane * LANE_WIDTH + LANE_WIDTH / 2;
        const y = commitIdx * rowHeight + rowHeight / 2;
        const labelX = x + nodeRadius + 8;

        return (
          <div
            key={`branch-${branch.name}`}
            onDragOver={(e) => handleBranchDragOver(e, branch.name)}
            onDragLeave={handleBranchDragLeave}
            onDrop={(e) => handleBranchDrop(e, branch.name)}
            style={{
              position: 'absolute',
              left: labelX,
              top: y - 8,
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'default',
              zIndex: 10,
              backgroundColor: dragOverBranch === branch.name
                ? 'rgba(137, 180, 250, 0.3)'
                : `${node.color}20`,
              color: node.color,
              border: dragOverBranch === branch.name
                ? '1px dashed var(--accent-blue)'
                : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}
            title={onDragCommit ? `Drop commit here to cherry-pick onto ${branch.name}` : undefined}
          >
            {branch.name}
          </div>
        );
      })}
    </div>
  );
};
