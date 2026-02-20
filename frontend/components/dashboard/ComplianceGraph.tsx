"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { ComplianceReport } from "@/types/policy";
import { transformReportToGraph } from "@/lib/graphUtils";

interface ComplianceGraphProps {
    report: ComplianceReport;
}

const ComplianceGraph: React.FC<ComplianceGraphProps> = ({ report }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<any>(null);
    const graphData = useMemo(() => transformReportToGraph(report), [report]);

    useEffect(() => {
        let ForceGraph3D: any;
        let THREE: any;

        const initGraph = async () => {
            if (!containerRef.current) return;

            // Dynamic import for client-side only
            const fgModule = await import('3d-force-graph');
            ForceGraph3D = fgModule.default;
            const threeModule = await import('three');
            THREE = threeModule;

            if (graphRef.current) {
                // Update data if graph exists
                graphRef.current.graphData(graphData);
                return;
            }

            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            const Graph = ForceGraph3D()(containerRef.current)
                .width(width)
                .height(height)
                .backgroundColor("#020617")
                .graphData(graphData)
                .nodeThreeObject((node: any) => {
                    let geometry;
                    let color;
                    let size = node.val ? node.val : 5;

                    if (node.group === "risk") {
                        geometry = new THREE.OctahedronGeometry(size * 1.5);
                        color = "#ef4444";
                    } else if (node.group === "policy") {
                        geometry = new THREE.BoxGeometry(size * 2, size * 2, size * 2);
                        color = "#3b82f6";
                    } else {
                        geometry = new THREE.SphereGeometry(size * 1.2, 24, 24);
                        color = "#06b6d4";
                    }

                    const material = new THREE.MeshPhongMaterial({
                        color,
                        transparent: true,
                        opacity: 0.9,
                        shininess: 100,
                        specular: new THREE.Color(color).multiplyScalar(1.5)
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    const wireframe = new THREE.WireframeGeometry(geometry);
                    const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 });
                    const line = new THREE.LineSegments(wireframe, lineMaterial);
                    mesh.add(line);

                    return mesh;
                })
                .nodeThreeObjectExtend(true)
                .linkColor(() => "rgba(6, 182, 212, 0.3)")
                .linkWidth(0.5)
                .linkDirectionalParticles(2)
                .linkDirectionalParticleSpeed(0.005)
                .linkDirectionalParticleWidth(2)
                .linkDirectionalParticleColor(() => "#06b6d4")
                .showNavInfo(false);

            // Physics tweaks
            Graph.d3Force('link').distance(150);
            Graph.d3Force('charge').strength(-500);

            // Auto rotate roughly
            // Graph.cameraPosition({ x: 500, y: 500, z: 500 });

            graphRef.current = Graph;
        };

        const timeout = setTimeout(initGraph, 100);

        const handleResize = () => {
            if (graphRef.current && containerRef.current) {
                graphRef.current.width(containerRef.current.clientWidth);
                graphRef.current.height(containerRef.current.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', handleResize);
            // Cleanup strictly isn't easy with pure lib without destructing DOM
        };
    }, [graphData]);


    if (!graphData || graphData.nodes.length === 0) return (
        <div className="h-[700px] w-full border border-slate-800 rounded-3xl flex items-center justify-center bg-[#020617] text-slate-500">
            Initializing Neural Topology...
        </div>
    );

    return (
        <div className="relative group w-full h-[700px] border border-slate-800 rounded-3xl overflow-hidden bg-[#020617] shadow-2xl">
            {/* Legend / Overlay - HUD Style */}
            <div className="absolute top-6 left-6 z-10 bg-slate-950/60 p-4 rounded-2xl text-white text-xs border border-cyan-500/20 backdrop-blur-xl shadow-2xl pointer-events-none select-none">
                <h3 className="font-bold text-xl mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono tracking-tighter uppercase italic">
                    System Topology (3D)
                </h3>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-500 rounded-sm shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        <span className="font-medium text-slate-300">Policy (Constraint)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                        <span className="font-medium text-slate-300">Component (Asset)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-red-500 rotate-45 transform shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                        <span className="font-medium text-slate-300">Risk / Violation</span>
                    </div>
                </div>
            </div>

            {/* AI HUD Controls */}
            <div className="absolute bottom-6 left-6 z-10 text-[10px] text-cyan-500/50 pointer-events-none bg-slate-950/40 px-3 py-1.5 rounded-full border border-cyan-500/10 backdrop-blur-sm uppercase tracking-[0.2em] font-mono">
                L: Rotate | R: Pan | Wheel: Zoom | Drag Nodes: Position
            </div>

            <div className="absolute bottom-6 right-6 z-50 flex gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (graphRef.current) {
                            graphRef.current.zoomToFit(800, 100);
                        }
                    }}
                    className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-cyan-500/20 backdrop-blur-sm transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                    Recenter Matrix
                </button>
            </div>

            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
};

export default ComplianceGraph;
