// src/components/CardSelector.tsx
import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva'
import useImage from 'use-image'

export interface RectCoords {
    x: number
    y: number
    width: number
    height: number
}

interface CardSelectorProps {
    /** URL of the image to annotate */
    imageUrl: string
    /** Called with { x,y,width,height } once user finishes selection */
    onSelect: (rect: RectCoords) => void
    /** Optional instruction text */
    instruction?: string
}

export default function CardSelector({
    imageUrl,
    onSelect,
    instruction = 'Drag to select'
}: CardSelectorProps) {
    const [img] = useImage(imageUrl, 'anonymous')
    const stageRef = useRef<any>(null)

    const [drawing, setDrawing] = useState(false)
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
    const [rect, setRect] = useState<{
        x: number
        y: number
        width: number
        height: number
    } | null>(null)

    // mouse down: begin drawing
    const handleMouseDown = (e: any) => {
        const stage = stageRef.current
        const point = stage.getPointerPosition()
        setStartPos(point)
        setRect({ x: point.x, y: point.y, width: 0, height: 0 })
        setDrawing(true)
    }

    // mouse move: update rectangle
    const handleMouseMove = (e: any) => {
        if (!drawing || !startPos) return
        const stage = stageRef.current
        const pos = stage.getPointerPosition()
        if (!pos) return

        const x = Math.min(startPos.x, pos.x)
        const y = Math.min(startPos.y, pos.y)
        const width = Math.abs(pos.x - startPos.x)
        const height = Math.abs(pos.y - startPos.y)
        setRect({ x, y, width, height })
    }

    // mouse up: finish drawing, convert to bottom-left coords and report
    const handleMouseUp = () => {
        if (!rect || !img) {
            setDrawing(false)
            return
        }
        const stageHeight = img.height || 0

        // convert y from top-left origin to bottom-left origin
        const bottomY = stageHeight - (rect.y + rect.height)

        onSelect({
            x: rect.x,
            y: bottomY,
            width: rect.width,
            height: rect.height
        })
        setDrawing(false)
    }

    // if image changes, clear any existing rect
    useEffect(() => {
        setRect(null)
        setStartPos(null)
        setDrawing(false)
    }, [imageUrl])

    if (!img) {
        return <p>Loading image...</p>
    }

    return (
        <div>
            <p style={{ marginBottom: 8, fontStyle: 'italic' }}>{instruction}</p>
            <Stage
                width={img.width}
                height={img.height}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                ref={stageRef}
                style={{ border: '1px solid #ccc', cursor: drawing ? 'crosshair' : 'default' }}
            >
                <Layer>
                    <KonvaImage image={img} />
                    {rect && (
                        <Rect
                            x={rect.x}
                            y={rect.y}
                            width={rect.width}
                            height={rect.height}
                            stroke="red"
                            strokeWidth={2}
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    )
}
