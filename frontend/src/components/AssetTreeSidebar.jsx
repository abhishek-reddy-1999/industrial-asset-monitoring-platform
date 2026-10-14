import React, { useState } from 'react';
import { 
  Folder, FolderOpen, Tag as TagIcon, ChevronRight, 
  ChevronDown, Search, Activity, Cpu, Sparkles, X
} from 'lucide-react';

export default function AssetTreeSidebar({ 
  treeData, 
  liveTelemetry, 
  onAddTagToDashboard,
  onClose
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState({ 1: true, 2: true, 3: true, 4: true });

  const toggleNode = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTree = (nodes) => {
    if (!nodes || nodes.length === 0) return null;

    return nodes.map((node) => {
      const isExpanded = !!expandedNodes[node.id];
      const hasChildren = (node.children && node.children.length > 0) || (node.tags && node.tags.length > 0);

      // Filtering
      const matchesSearch = !searchTerm || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.tags && node.tags.some(t => t.tag_name.toLowerCase().includes(searchTerm.toLowerCase()) || t.display_name.toLowerCase().includes(searchTerm.toLowerCase())));

      if (!matchesSearch) return null;

      return (
        <div key={node.id} style={{ marginLeft: node.parent_id ? '12px' : '0px', marginTop: '3px' }}>
          <div 
            className="tree-node"
            onClick={() => toggleNode(node.id)}
            style={{ fontWeight: node.parent_id ? 500 : 600 }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />
            ) : <span style={{ width: 14 }} />}

            {isExpanded ? (
              <FolderOpen size={15} color="#38bdf8" />
            ) : (
              <Folder size={15} color="#64748b" />
            )}

            <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.name}
            </span>
          </div>

          {/* Children nodes */}
          {isExpanded && node.children && node.children.length > 0 && (
            <div>{renderTree(node.children)}</div>
          )}

          {/* Associated Tags */}
          {isExpanded && node.tags && node.tags.length > 0 && (
            <div style={{ marginTop: '2px' }}>
              {node.tags.map((tag) => {
                const live = liveTelemetry[tag.tag_name];
                const val = live ? live.value : '--';
                const quality = live?.quality || 'GOOD';

                return (
                  <div 
                    key={tag.id} 
                    className="tag-item"
                    title={`Click to add ${tag.tag_name} to dashboard`}
                    onClick={() => onAddTagToDashboard(tag)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <TagIcon size={12} color="#a855f7" />
                      <span style={{ fontWeight: 500, fontSize: '0.78rem' }}>{tag.tag_name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="tag-val-preview">
                        {val} {tag.eng_units}
                      </span>
                      <span 
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: quality === 'GOOD' ? '#10b981' : '#f59e0b'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <aside className="asset-sidebar">
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="sidebar-title">ISA-95 Plant Asset Hierarchy</span>
          <Sparkles size={14} color="#38bdf8" />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
            title="Close sidebar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} color="#64748b" style={{ position: 'absolute', left: '8px', top: '9px' }} />
          <input 
            type="text"
            className="form-input"
            placeholder="Filter tags / equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '28px', fontSize: '0.78rem', height: '30px' }}
          />
        </div>
      </div>

      <div className="tree-container">
        {(!treeData || treeData.length === 0) ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
            <Folder size={26} style={{ margin: '0 auto 8px', opacity: 0.3, color: '#38bdf8' }} />
            <div style={{ fontWeight: 600, color: '#cbd5e1' }}>No Assets Created Yet</div>
            <div style={{ fontSize: '0.72rem', marginTop: '4px', lineHeight: 1.4 }}>
              Switch to <strong>DM (Device Manager)</strong> in top navigation to manually create your enterprise asset tree.
            </div>
          </div>
        ) : renderTree(treeData)}
      </div>

      <div style={{ 
        padding: '10px 14px', 
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.72rem',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>Yokogawa DBM Ontology</span>
        <span style={{ color: '#10b981', fontWeight: 600 }}>CFIHOS 1.5</span>
      </div>
    </aside>
  );
}
