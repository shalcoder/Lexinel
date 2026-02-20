"use client";

import React from 'react';
import dynamic from 'next/dynamic';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

const gData = {
    nodes: [
        { id: 'id1', group: 1 },
        { id: 'id2', group: 2 },
        { id: 'id3', group: 1 },
    ],
    links: [
        { source: 'id1', target: 'id2' },
        { source: 'id2', target: 'id3' }
    ]
};

export default function TestGraphPage() {
    return (
        <div className="h-screen w-screen bg-black text-white">
            <h1>3D Graph Isolation Test</h1>
            <div style={{ height: '800px', width: '100%', border: '1px solid red' }}>
                <ForceGraph3D
                    graphData={gData}
                    nodeAutoColorBy="group"
                />
            </div>
        </div>
    );
}
