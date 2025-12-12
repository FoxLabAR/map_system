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
  colors
} = useDiagramState()

// Local UI state
const selectedNode = ref<any>(null)
const isDeleteMode = ref(false)
const editingLabelId = ref<string | null>(null)
const openColorPickerId = ref<string | null>(null)
const pickerPosition = ref({ x: 0, y: 0 })

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
        {{ sidebarOpen ? 'Hide List' : 'Show List' }}
      </button>
      <button @click="storeAddNode('central')" class="btn-primary">Add Goal</button>
      <button @click="storeAddNode('input')" class="btn-secondary">Add Input</button>
      <div v-if="isDeleteMode" class="mode-indicator">DELETE MODE</div>
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
        <h3>All Nodes</h3>
      </div>

      <div class="sidebar-search">
        <input v-model="searchQuery" type="text" placeholder="Search nodes..." class="search-input" />
      </div>

      <div class="node-list">
        <table class="node-table">
          <thead>
            <tr>
              <th width="10%">Color</th>
              <th width="15%">Code</th>
              <th width="55%">Label</th>
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
                <span v-else @click="startEditingLabel(node.id)" title="Click to edit">{{ node.data.label }}</span>
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
</style>
