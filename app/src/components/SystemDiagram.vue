<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import CustomNode from './CustomNode.vue'
import CustomEdge from './CustomEdge.vue'
import { useDiagramState } from '../stores/diagramStore'

// Import styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const { findNode, removeNodes, removeEdges } = useVueFlow()

// Use the singleton store
const { 
  nodes, 
  edges, 
  sidebarOpen, 
  searchQuery, 
  loadFromStorage, 
  recalculateTree, 
  recalculateWeights,
  addNode: storeAddNode,
  clearDiagram,
  colors
} = useDiagramState()

// Local UI state
const selectedNode = ref<any>(null)
const isDeleteMode = ref(false)
const editingLabelId = ref<string | null>(null)
const openColorPickerId = ref<string | null>(null)
const pickerPosition = ref({ x: 0, y: 0 })
const showClearModal = ref(false)

// Filtered nodes for search
const filteredNodes = computed(() => {
  if (!searchQuery.value) return nodes.value
  const query = searchQuery.value.toLowerCase()
  return nodes.value.filter(n => 
    n.data.label.toLowerCase().includes(query) || 
    (n.data.code && n.data.code.toLowerCase().includes(query))
  )
})

// Label editing
const startEditingLabel = (nodeId: string) => {
  editingLabelId.value = nodeId
}

const stopEditingLabel = () => {
  editingLabelId.value = null
}



// Color picker
const toggleColorPicker = (nodeId: string, event: MouseEvent) => {
  if (openColorPickerId.value === nodeId) {
    openColorPickerId.value = null
  } else {
    openColorPickerId.value = nodeId
    const target = event.target as HTMLElement
    const rect = target.getBoundingClientRect()
    pickerPosition.value = {
      x: rect.right + 10,
      y: rect.top
    }
  }
}

const selectColor = (color: string) => {
  if (!openColorPickerId.value) return
  const node = nodes.value.find(n => n.id === openColorPickerId.value)
  if (node) {
    node.data = { ...node.data, color }
  }
  openColorPickerId.value = null
}

const closeColorPicker = () => {
  openColorPickerId.value = null
}

// v-focus directive
const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
}

// Delete mode handlers
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Control' || e.key === 'Meta') {
    isDeleteMode.value = true
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Control' || e.key === 'Meta') {
    isDeleteMode.value = false
  }
}

// Lifecycle hooks
onMounted(() => {
  // Use nextTick to ensure VueFlow is fully mounted before loading
  nextTick(() => {
    loadFromStorage()
  })
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('click', (e: any) => {
    if (!e.target.closest('.color-popover') && !e.target.closest('.color-preview')) {
      closeColorPicker()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

// Clear diagram with confirmation
const handleClear = () => {
  showClearModal.value = true
}

const confirmClear = () => {
  clearDiagram()
  showClearModal.value = false
}

const cancelClear = () => {
  showClearModal.value = false
}

// Export functions
const exportCSV = () => {
  // Create CSV header
  let csv = 'Code,Label,Peso\n'
  
  // Add data rows
  filteredNodes.value.forEach(node => {
    const code = node.data.code || '-'
    const label = node.data.label || ''
    const weight = node.data.totalWeight || 0
    // Escape commas and quotes in label
    const escapedLabel = `"${label.replace(/"/g, '""')}"`
    csv += `${code},${escapedLabel},${weight}\n`
  })
  
  // Create download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `diagram_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const exportJSON = () => {
  // Create JSON data
  const data = filteredNodes.value.map(node => ({
    code: node.data.code || '-',
    label: node.data.label || '',
    weight: node.data.totalWeight || 0,
    level: node.data.level || 0,
    color: node.data.color || '#64748b'
  }))
  
  const jsonStr = JSON.stringify(data, null, 2)
  
  // Create download
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `diagram_${new Date().toISOString().split('T')[0]}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Connect handler
const onConnect = (params: any) => {
  const edgeColor = '#64748b'

  // Update STORE state directly
  edges.value = [
    ...edges.value,
    {
      ...params,
      id: `e-${params.source}-${params.target}`,
      type: 'custom',
      data: { sign: '+', color: edgeColor },
      markerEnd: MarkerType.ArrowClosed,
    }
  ]
  
  setTimeout(recalculateTree, 100)
}

const onNodeClick = (event: any) => {
  if (isDeleteMode.value) {
    if (event.node.data.type === 'central') return
    removeNodes([event.node.id])
    
    if (selectedNode.value && selectedNode.value.id === event.node.id) {
      selectedNode.value = null
      sidebarOpen.value = false
    }
    // Recalculate weights after removing a node (affects connected nodes)
    setTimeout(recalculateWeights, 50)
    return
  }

  selectedNode.value = event.node
  sidebarOpen.value = true
}

const onEdgeClick = (event: any) => {
  if (isDeleteMode.value) {
    removeEdges([event.edge.id])
    // Recalculate weights after removing an edge (changes connections)
    setTimeout(recalculateWeights, 50)
  }
}
</script>

<template>
  <div class="diagram-container" :class="{ 'delete-mode': isDeleteMode }">
    <div class="toolbar glass">
      <button @click="sidebarOpen = !sidebarOpen" class="btn-secondary">
        {{ sidebarOpen ? 'Ocultar Lista' : 'Mostrar Lista' }}
      </button>
      <button @click="storeAddNode('input')" class="btn-secondary">Agregar Nodo</button>
      <div v-if="isDeleteMode" class="mode-indicator">MODO BORRAR</div>
    </div>

    <div class="main-area">
      <VueFlow v-model:nodes="nodes" v-model:edges="edges" :default-viewport="{ zoom: 1 }" :min-zoom="0.2" :max-zoom="4"
        fit-view-on-init @node-click="onNodeClick" @edge-click="onEdgeClick" @connect="onConnect">
        <template #node-custom="props">
          <CustomNode :data="props.data" />
        </template>

        <template #edge-custom="props">
          <CustomEdge v-bind="props" />
        </template>

        <Background pattern-color="#3b82f6" :gap="20" />
        <Controls />
      </VueFlow>
    </div>

    <div class="sidebar glass" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <h3>Todos los Nodos</h3>
        <div class="export-buttons">
          <button @click="exportCSV" class="btn-export" title="Exportar como CSV">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            CSV
          </button>
          <button @click="exportJSON" class="btn-export" title="Exportar como JSON">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            JSON
          </button>
        </div>
      </div>

      <div class="sidebar-search">
        <input v-model="searchQuery" type="text" placeholder="Buscar nodos..." class="search-input" />
      </div>

      <div class="node-list">
        <table class="node-table">
          <thead>
            <tr>
              <th width="10%">Color</th>
              <th width="15%">Código</th>
              <th width="55%">Etiqueta</th>
              <th width="20%">Peso</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="node in filteredNodes" :key="node.id" @click="onNodeClick({ node })">
              <td class="col-color color-cell" @click.stop>
                <div class="color-preview" :style="{ backgroundColor: node.data.color || '#64748b' }"
                  @click="toggleColorPicker(node.id, $event)"></div>
              </td>
              <td class="col-code">{{ node.data.code || '-' }}</td>
              <td class="col-label" @click.stop>
                <input v-if="editingLabelId === node.id" v-model="node.data.label" @blur="stopEditingLabel"
                  @keyup.enter="stopEditingLabel" class="inline-input" v-focus />
                <span v-else @click="startEditingLabel(node.id)" title="Click para editar">{{ node.data.label }}</span>
              </td>
              <td class="col-weight">
                <span>{{ node.data.totalWeight || 0 }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Global Color Picker -->
    <Teleport to="body">
      <div v-if="openColorPickerId" class="color-popover"
        :style="{ top: pickerPosition.y + 'px', left: pickerPosition.x + 'px' }">
        <div v-for="c in colors" :key="c" class="color-option" :style="{ backgroundColor: c }" @click="selectColor(c)">
        </div>
      </div>
    </Teleport>

    <!-- Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showClearModal" class="modal-overlay" @click="cancelClear">
        <div class="modal-content glass" @click.stop>
          <h2>Confirmar Limpieza</h2>
          <p>¿Estás seguro de que quieres limpiar el diagrama?</p>
          <p class="modal-warning">Esta acción no se puede deshacer.</p>
          <div class="modal-actions">
            <button @click="cancelClear" class="btn-secondary">Cancelar</button>
            <button @click="confirmClear" class="btn-danger">Limpiar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Floating Clear Button -->
    <button @click="handleClear" class="floating-clear-btn" title="Limpiar diagrama">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.diagram-container {
  width: 100%;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
}

.main-area {
  flex: 1;
  height: 100%;
  position: relative;
  transition: all 0.3s ease;
}

.toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.mode-indicator {
  background: #ef4444;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: bold;
  font-size: 14px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }

  100% {
    opacity: 1;
  }
}

.sidebar {
  width: 0;
  height: 100%;
  position: relative;
  z-index: 20;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.95);
  border-left: 1px solid var(--glass-border);
  overflow: hidden;
  white-space: nowrap;
  /* Prevent content wrapping during transition */
}

.sidebar.open {
  width: 50%;
  padding: 20px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.export-buttons {
  display: flex;
  gap: 8px;
}

.btn-export {
  background: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  padding: 0.4rem 0.8rem;
  border-radius: 0.4rem;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.btn-export:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.btn-export svg {
  width: 14px;
  height: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 24px;
  cursor: pointer;
}

.sidebar-search {
  margin-bottom: 15px;
}

.search-input {
  width: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--glass-border);
  border-radius: 4px;
  color: white;
}

.node-list {
  overflow-y: auto;
  flex-grow: 1;
  padding-bottom: 50px;
  /* Space for popovers */
}

.node-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  table-layout: fixed;
  /* Enforce fixed widths */
}

.node-table th {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid var(--glass-border);
  color: var(--secondary-color);
  font-weight: bold;
}

.node-table td {
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
  overflow: hidden;
}

.node-table tr:hover td {
  background: rgba(255, 255, 255, 0.05);
}

.col-code {
  font-weight: bold;
  color: var(--primary-color);
}

.col-label {
  color: var(--text-color);
  cursor: text;
}

.col-label span {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  /* Allow wrapping */
  word-break: break-word;
  line-height: 1.2;
}

.col-weight {
  color: var(--text-color);
  cursor: text;
  text-align: center;
}

.inline-input {
  width: 100%;
  background: transparent;
  border: 1px solid var(--primary-color);
  color: white;
  padding: 4px;
  border-radius: 4px;
}

.weight-input {
  text-align: center;
}

.col-color {
  position: relative;
  text-align: center;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 0 auto;
}

.color-popover {
  position: fixed;
  /* Fixed to viewport */
  background: #1e293b;
  border: 1px solid var(--glass-border);
  padding: 8px;
  border-radius: 8px;
  display: flex;
  gap: 4px;
  z-index: 9999;
  /* Very high z-index */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.color-option {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
}

.color-option:hover {
  transform: scale(1.1);
}

.floating-clear-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  transition: all 0.3s ease;
}

.floating-clear-btn:hover {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
}

.floating-clear-btn:active {
  transform: scale(0.95);
}

.floating-clear-btn svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-content h2 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1.5rem;
}

.modal-content p {
  margin: 0.5rem 0;
  color: var(--text-color);
  line-height: 1.5;
}

.modal-warning {
  color: #ef4444;
  font-weight: 600;
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
}

.modal-actions .btn-secondary,
.modal-actions .btn-danger {
  min-width: 100px;
}
</style>
