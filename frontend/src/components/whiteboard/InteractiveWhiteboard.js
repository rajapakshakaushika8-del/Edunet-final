import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Rect, Text } from 'react-konva';
import { 
  Pen, 
  Eraser, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Move
} from 'lucide-react';
import './InteractiveWhiteboard.css';

const InteractiveWhiteboard = ({ socket, roomId, currentUser }) => {
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [color, setColor] = useState('#8B4513');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [, setIsDrawing] = useState(false);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [newText, setNewText] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  
  const stageRef = useRef();
  const isDrawingRef = useRef(false);

  const colors = [
    '#8B4513', '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#FFFFFF'
  ];

  useEffect(() => {
    if (!socket) return;

    // Listen for whiteboard updates from other users
    socket.on('whiteboard-update', (data) => {
      if (data.userId !== currentUser?.userId) {
        switch (data.type) {
          case 'line':
            setLines(prev => [...prev, data.element]);
            break;
          case 'shape':
            setShapes(prev => [...prev, data.element]);
            break;
          case 'text':
            setTexts(prev => [...prev, data.element]);
            break;
          case 'clear':
            clearWhiteboard();
            break;
          default:
            break;
        }
      }
    });

    socket.on('whiteboard-state', (data) => {
      setLines(data.lines || []);
      setShapes(data.shapes || []);
      setTexts(data.texts || []);
    });

    return () => {
      socket.off('whiteboard-update');
      socket.off('whiteboard-state');
    };
  }, [socket, currentUser?.userId]);

  const broadcastUpdate = useCallback((type, element) => {
    if (socket) {
      socket.emit('whiteboard-draw', {
        roomId,
        type,
        element,
        userId: currentUser?.userId
      });
    }
  }, [socket, roomId, currentUser?.userId]);

  const handleMouseDown = useCallback((e) => {
    if (tool === 'text') return;

    isDrawingRef.current = true;
    setIsDrawing(true);
    
    const pos = e.target.getStage().getPointerPosition();
    const adjustedPos = {
      x: (pos.x - stagePos.x) / scale,
      y: (pos.y - stagePos.y) / scale
    };

    if (tool === 'pen' || tool === 'eraser') {
      const newLine = {
        id: Date.now().toString(),
        tool,
        points: [adjustedPos.x, adjustedPos.y],
        stroke: tool === 'eraser' ? '#FFFFFF' : color,
        strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
        globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over'
      };
      setLines(prev => [...prev, newLine]);
    } else if (tool === 'rectangle') {
      const newRect = {
        id: Date.now().toString(),
        type: 'rectangle',
        x: adjustedPos.x,
        y: adjustedPos.y,
        width: 0,
        height: 0,
        stroke: color,
        strokeWidth
      };
      setShapes(prev => [...prev, newRect]);
    } else if (tool === 'circle') {
      const newCircle = {
        id: Date.now().toString(),
        type: 'circle',
        x: adjustedPos.x,
        y: adjustedPos.y,
        radius: 0,
        stroke: color,
        strokeWidth
      };
      setShapes(prev => [...prev, newCircle]);
    }
  }, [tool, color, strokeWidth, scale, stagePos]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawingRef.current || tool === 'text') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const adjustedPoint = {
      x: (point.x - stagePos.x) / scale,
      y: (point.y - stagePos.y) / scale
    };

    if (tool === 'pen' || tool === 'eraser') {
      setLines(prev => {
        const newLines = [...prev];
        const lastLine = newLines[newLines.length - 1];
        if (lastLine) {
          lastLine.points = [...lastLine.points, adjustedPoint.x, adjustedPoint.y];
        }
        return newLines;
      });
    } else if (tool === 'rectangle') {
      setShapes(prev => {
        const newShapes = [...prev];
        const lastShape = newShapes[newShapes.length - 1];
        if (lastShape && lastShape.type === 'rectangle') {
          lastShape.width = adjustedPoint.x - lastShape.x;
          lastShape.height = adjustedPoint.y - lastShape.y;
        }
        return newShapes;
      });
    } else if (tool === 'circle') {
      setShapes(prev => {
        const newShapes = [...prev];
        const lastShape = newShapes[newShapes.length - 1];
        if (lastShape && lastShape.type === 'circle') {
          const dx = adjustedPoint.x - lastShape.x;
          const dy = adjustedPoint.y - lastShape.y;
          lastShape.radius = Math.sqrt(dx * dx + dy * dy);
        }
        return newShapes;
      });
    }
  }, [tool, scale, stagePos]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    
    isDrawingRef.current = false;
    setIsDrawing(false);

    // Broadcast the latest element to other users
    if (tool === 'pen' || tool === 'eraser') {
      const lastLine = lines[lines.length - 1];
      if (lastLine) {
        broadcastUpdate('line', lastLine);
      }
    } else if (tool === 'rectangle' || tool === 'circle') {
      const lastShape = shapes[shapes.length - 1];
      if (lastShape) {
        broadcastUpdate('shape', lastShape);
      }
    }
  }, [tool, lines, shapes, broadcastUpdate]);

  const handleStageClick = (e) => {
    if (tool === 'text') {
      const pos = e.target.getStage().getPointerPosition();
      const adjustedPos = {
        x: (pos.x - stagePos.x) / scale,
        y: (pos.y - stagePos.y) / scale
      };
      setTextPosition(adjustedPos);
    } else {
      setSelectedId(null);
      setTextPosition(null);
    }
  };

  const addText = () => {
    if (newText && textPosition) {
      const textElement = {
        id: Date.now().toString(),
        x: textPosition.x,
        y: textPosition.y,
        text: newText,
        fontSize: 16,
        fill: color
      };
      
      setTexts(prev => [...prev, textElement]);
      broadcastUpdate('text', textElement);
      setNewText('');
      setTextPosition(null);
    }
  };

  const clearWhiteboard = () => {
    setLines([]);
    setShapes([]);
    setTexts([]);
    setSelectedId(null);
    setTextPosition(null);
  };

  const handleClear = () => {
    clearWhiteboard();
    if (socket) {
      socket.emit('whiteboard-draw', {
        roomId,
        type: 'clear',
        userId: currentUser?.userId
      });
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.3));
  };

  const resetView = () => {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  const downloadWhiteboard = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="interactive-whiteboard">
      {/* Toolbar */}
      <div className="whiteboard-toolbar">
        <div className="tool-group">
          <button
            className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
            onClick={() => setTool('pen')}
            title="Pen"
          >
            <Pen size={18} />
          </button>
          <button
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>
          <button
            className={`tool-btn ${tool === 'rectangle' ? 'active' : ''}`}
            onClick={() => setTool('rectangle')}
            title="Rectangle"
          >
            <Square size={18} />
          </button>
          <button
            className={`tool-btn ${tool === 'circle' ? 'active' : ''}`}
            onClick={() => setTool('circle')}
            title="Circle"
          >
            <CircleIcon size={18} />
          </button>
          <button
            className={`tool-btn ${tool === 'text' ? 'active' : ''}`}
            onClick={() => setTool('text')}
            title="Text"
          >
            <Type size={18} />
          </button>
        </div>

        <div className="tool-group">
          <div className="color-palette">
            {colors.map((c, index) => (
              <button
                key={index}
                className={`color-btn ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                title={`Color: ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="tool-group">
          <label className="stroke-width-label">
            <span>Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="stroke-width-slider"
            />
            <span>{strokeWidth}px</span>
          </label>
        </div>

        <div className="tool-group">
          <button className="tool-btn" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={18} />
          </button>
          <button className="tool-btn" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <button className="tool-btn" onClick={resetView} title="Reset View">
            <Move size={18} />
          </button>
        </div>

        <div className="tool-group">
          <button className="tool-btn" onClick={downloadWhiteboard} title="Download">
            <Download size={18} />
          </button>
          <button 
            className="tool-btn danger" 
            onClick={handleClear} 
            title="Clear All"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Text Input Modal */}
      {textPosition && (
        <div className="text-input-modal">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter text..."
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') addText();
              if (e.key === 'Escape') setTextPosition(null);
            }}
          />
          <div className="text-input-actions">
            <button onClick={addText} disabled={!newText}>Add</button>
            <button onClick={() => setTextPosition(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Whiteboard Canvas */}
      <div className="whiteboard-canvas">
        <Stage
          width={window.innerWidth - 300}
          height={window.innerHeight - 200}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          ref={stageRef}
          draggable={tool === 'move'}
          onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
        >
          <Layer>
            {/* Draw lines */}
            {lines.map((line) => (
              <Line
                key={line.id}
                points={line.points}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={line.globalCompositeOperation}
              />
            ))}
            
            {/* Draw shapes */}
            {shapes.map((shape) => {
              if (shape.type === 'rectangle') {
                return (
                  <Rect
                    key={shape.id}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    fill="transparent"
                  />
                );
              } else if (shape.type === 'circle') {
                return (
                  <Circle
                    key={shape.id}
                    x={shape.x}
                    y={shape.y}
                    radius={shape.radius}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    fill="transparent"
                  />
                );
              }
              return null;
            })}
            
            {/* Draw texts */}
            {texts.map((textEl) => (
              <Text
                key={textEl.id}
                x={textEl.x}
                y={textEl.y}
                text={textEl.text}
                fontSize={textEl.fontSize}
                fill={textEl.fill}
                draggable={selectedId === textEl.id}
                onClick={() => setSelectedId(textEl.id)}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Status Bar */}
      <div className="whiteboard-status">
        <span>Tool: {tool}</span>
        <span>Zoom: {Math.round(scale * 100)}%</span>
        <span>Elements: {lines.length + shapes.length + texts.length}</span>
      </div>
    </div>
  );
};

export default InteractiveWhiteboard;