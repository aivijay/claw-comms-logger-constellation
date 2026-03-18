'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { ConstellationNode, ConstellationEdge } from '@/types/constellation';
import { cn } from '@/lib/utils';

interface ConstellationCanvasProps {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  onNodeClick?: (node: ConstellationNode) => void;
  onNodeHover?: (node: ConstellationNode | null) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6',
  idle: '#f59e0b',
  error: '#ef4444',
  offline: '#64748b',
};

const ROLE_SIZES: Record<string, number> = {
  orchestrator: 38,
  developer: 28,
  qa: 24,
  researcher: 26,
  designer: 26,
  other: 24,
};

interface NodePosition {
  node: ConstellationNode;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  radius: number;
}

export function ConstellationCanvas({ 
  nodes, 
  edges, 
  onNodeClick, 
  onNodeHover 
}: ConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);
  const [hoveredNode, setHoveredNode] = useState<ConstellationNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  // Initialize node positions
  useEffect(() => {
    if (!nodes.length || !dimensions.width) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const baseRadius = Math.min(dimensions.width, dimensions.height) * 0.35;

    const orchestrator = nodes.find(n => n.role === 'orchestrator');
    const otherNodes = nodes.filter(n => n.role !== 'orchestrator');

    const positions: NodePosition[] = [];

    // Place orchestrator in center
    if (orchestrator) {
      positions.push({
        node: orchestrator,
        x: centerX,
        y: centerY,
        targetX: centerX,
        targetY: centerY,
        angle: 0,
        radius: 0,
      });
    }

    // Place other nodes in orbit
    otherNodes.forEach((node, i) => {
      const angle = (i / otherNodes.length) * Math.PI * 2 - Math.PI / 2;
      const radius = baseRadius * (0.8 + Math.random() * 0.4);
      const targetX = centerX + Math.cos(angle) * radius;
      const targetY = centerY + Math.sin(angle) * radius;

      positions.push({
        node,
        x: targetX + (Math.random() - 0.5) * 50,
        y: targetY + (Math.random() - 0.5) * 50,
        targetX,
        targetY,
        angle,
        radius,
      });
    });

    setNodePositions(positions);
  }, [nodes, dimensions]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const animate = () => {
      time += 0.016;
      
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw star field
      drawStars(ctx, canvas.width, canvas.height, time);

      // Draw edges
      edges.forEach(edge => {
        const fromPos = nodePositions.find(n => n.node.id === edge.from);
        const toPos = nodePositions.find(n => n.node.id === edge.to);
        if (fromPos && toPos) {
          drawEdge(ctx, fromPos, toPos, edge, time);
        }
      });

      // Draw nodes
      nodePositions.forEach(pos => {
        drawNode(ctx, pos, time, hoveredNode);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodePositions, edges, hoveredNode]);

  const drawStars = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * width;
      const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * height;
      const size = (Math.sin(time + i) * 0.5 + 0.5) * 1.5 + 0.5;
      const opacity = (Math.sin(time * 2 + i) * 0.3 + 0.5) * 0.8;
      
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const drawEdge = (ctx: CanvasRenderingContext2D, from: NodePosition, to: NodePosition, edge: ConstellationEdge, time: number) => {
    const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    const fromColor = STATUS_COLORS[from.node.status] || '#3b82f6';
    const toColor = STATUS_COLORS[to.node.status] || '#3b82f6';
    
    gradient.addColorStop(0, fromColor);
    gradient.addColorStop(1, toColor);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Draw pulse
    const pulsePos = (time * 0.5) % 1;
    const px = from.x + (to.x - from.x) * pulsePos;
    const py = from.y + (to.y - from.y) * pulsePos;
    
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  };

  const drawNode = (ctx: CanvasRenderingContext2D, pos: NodePosition, time: number, hovered: ConstellationNode | null) => {
    const { node, x, y } = pos;
    const size = ROLE_SIZES[node.role] || 24;
    const color = STATUS_COLORS[node.status] || '#3b82f6';
    const isHovered = hovered?.id === node.id;
    
    // Breathing animation
    const breath = Math.sin(time * 2 + pos.angle) * 3;
    const nodeSize = size + (node.status === 'active' ? breath : 0);

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, nodeSize * 2);
    glow.addColorStop(0, color + '40');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, nodeSize * 2, 0, Math.PI * 2);
    ctx.fill();

    // Outer ring
    ctx.strokeStyle = color;
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle
    const innerGrad = ctx.createRadialGradient(x - nodeSize * 0.3, y - nodeSize * 0.3, 0, x, y, nodeSize);
    innerGrad.addColorStop(0, color + 'cc');
    innerGrad.addColorStop(1, color);
    ctx.fillStyle = innerGrad;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, nodeSize * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${isHovered ? 14 : 12}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.name, x, y + nodeSize + 16);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Find hovered node
    const hovered = nodePositions.find(pos => {
      const size = ROLE_SIZES[pos.node.role] || 24;
      const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
      return dist < size + 10;
    });

    const newHovered = hovered?.node || null;
    if (newHovered?.id !== hoveredNode?.id) {
      setHoveredNode(newHovered);
      onNodeHover?.(newHovered);
    }
  }, [nodePositions, hoveredNode, onNodeHover]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = nodePositions.find(pos => {
      const size = ROLE_SIZES[pos.node.role] || 24;
      const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
      return dist < size + 10;
    });

    if (clicked) {
      onNodeClick?.(clicked.node);
    }
  }, [nodePositions, onNodeClick]);

  return (
    <div 
      ref={containerRef} 
      className="constellation-container"
      style={{ cursor: hoveredNode ? 'pointer' : 'default' }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredNode(null);
          onNodeHover?.(null);
        }}
        onClick={handleClick}
        className="block"
      />
      
      {/* Hover tooltip */}
      {hoveredNode && (
        <div
          className="node-tooltip"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          <div className="font-semibold text-white">{hoveredNode.name}</div>
          <div className="text-slate-400 text-xs capitalize">{hoveredNode.role}</div>
          <div className={cn(
            "text-xs mt-1",
            hoveredNode.status === 'active' && "text-green-400",
            hoveredNode.status === 'idle' && "text-amber-400",
            hoveredNode.status === 'error' && "text-red-400",
            hoveredNode.status === 'offline' && "text-slate-400"
          )}>
            ● {hoveredNode.status}
          </div>
        </div>
      )}
    </div>
  );
}export default ConstellationCanvas;
