<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import CustomNode from './CustomNode.vue'
import CustomEdge from './CustomEdge.vue'

// Import styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const { addNodes, onConnect, addEdges, findNode, getEdges, getNodes, removeNodes, removeEdges, toObject, setViewport } = useVueFlow()

const STORAGE_KEY = 'system-diagram-data'

const nodes = ref([
  {
    id: 'goal',
    type: 'custom',
    position: { x: 400, y: 300 },
    data: { label: 'GOAL', type: 'central', shape: 'round', code: 'GOAL', level: 0, color: '#000000', weight: 0, totalWeight: 0 },
  },
])

const edges = ref([])

// Sidebar state
const selectedNode = ref<any>(null)
const sidebarOpen = ref(false)
const isDeleteMode = ref(false)
const searchQuery = ref('')

const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899']

const filteredNodes = computed(() => {
  if (!searchQuery.value) return nodes.value
  const query = searchQuery.value.toLowerCase()
  return nodes.value.filter(n =>
    n.data.label.toLowerCase().includes(query) ||
    (n.data.code && n.data.code.toLowerCase().includes(query))
  )
})

// Persistence Logic
const saveToStorage = () => {
  const data = toObject()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  // console.log('Saved to localStorage', data)
}

const loadFromStorage = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.nodes) {
        nodes.value = data.nodes
        edges.value = data.edges || []
        if (data.viewport) {
          setViewport(data.viewport)
        }
        // Recalculate tree after loading to ensure consistency
        setTimeout(recalculateTree, 100)
      }
    } catch (e) {
      console.error('Failed to load diagram data', e)
    }
  }
}

const recalculateWeights = () => {
  // Group nodes by level
  const levels = new Map<number, any[]>()
  let maxLevel = 0

  nodes.value.forEach(node => {
    const level = node.data.level || 0
    if (!levels.has(level)) levels.set(level, [])
    levels.get(level)!.push(node)
    if (level > maxLevel) maxLevel = level
  })

  // Iterate from max level down to 0 (Leaves -> Root)
  for (let i = maxLevel; i >= 0; i--) {
    const levelNodes = levels.get(i) || []

    levelNodes.forEach(node => {
      // Find inputs (children in tree terms, but sources in graph terms)
      // Edges: Source -> Target. 
      // If 'node' is the target, then 'source' is the input.
      const inputEdges = edges.value.filter(e => e.target === node.id)

      let inherited = 0
      inputEdges.forEach(e => {
        const sourceNode = nodes.value.find(n => n.id === e.source)
        if (sourceNode) {
          const signVal = e.data?.sign === '-' ? -1 : 1
          inherited += (sourceNode.data.totalWeight || 0) + signVal
        }
      })

      // Calculate total weight
      // If it's a leaf (no inputs), inherited is 0.
      node.data.totalWeight = (node.data.weight || 0) + inherited
    })
  }
}

// Watch for changes to save and recalculate
watch([nodes, edges], () => {
  recalculateWeights()
  saveToStorage()
}, { deep: true })

const editingLabelId = ref<string | null>(null)
const editingWeightId = ref<string | null>(null)
const openColorPickerId = ref<string | null>(null)
const pickerPosition = ref({ x: 0, y: 0 })

const startEditingLabel = (nodeId: string) => {
  editingLabelId.value = nodeId
}

const stopEditingLabel = () => {
  editingLabelId.value = null
}

const startEditingWeight = (nodeId: string) => {
  editingWeightId.value = nodeId
}

const stopEditingWeight = () => {
  editingWeightId.value = null
}

const updateNodeWeight = (node: any, newTotal: number) => {
  // Calculate what the base weight should be to achieve the new total
  // total = base + inherited
  // base = total - inherited

  // We need to re-calculate inherited for this node
  const inputEdges = edges.value.filter(e => e.target === node.id)
  let inherited = 0
  inputEdges.forEach(e => {
    const sourceNode = nodes.value.find(n => n.id === e.source)
    if (sourceNode) {
      const signVal = e.data?.sign === '-' ? -1 : 1
      inherited += (sourceNode.data.totalWeight || 0) + signVal
    }
  })

  node.data.weight = newTotal - inherited
  // Recalculation will happen via watcher
}

const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
}

const toggleColorPicker = (nodeId: string, event: MouseEvent) => {
  if (openColorPickerId.value === nodeId) {
    openColorPickerId.value = null
  } else {
    openColorPickerId.value = nodeId
    // Calculate position
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

// Close color picker when clicking outside
const closeColorPicker = () => {
  openColorPickerId.value = null
}

// Key listeners for Delete Mode
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

onMounted(() => {
  loadFromStorage()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('click', (e: any) => {
    // Close if clicking outside the picker and not on a color preview button
    if (!e.target.closest('.color-popover') && !e.target.closest('.color-preview')) {
      closeColorPicker()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

const recalculateTree = () => {
  const goalNode = nodes.value.find(n => n.data.type === 'central')
  if (!goalNode) return

  // Use getEdges() to get the most up-to-date edges from VueFlow store
  const currentEdges = getEdges.value

  // BFS Queue: { nodeId, level, code }
  const queue = [{ id: goalNode.id, level: 0, code: 'GOAL' }]
  const visited = new Set([goalNode.id])

  // Update GOAL
  goalNode.data = { ...goalNode.data, level: 0, code: 'GOAL' }

  while (queue.length > 0) {
    const current = queue.shift()!

    // Find children connected to this node (Inputs flow INTO the node)
    // So we look for edges where TARGET is current.id
    // The SOURCE of those edges are the children (inputs)
    const childrenEdges = currentEdges.filter(e => e.target === current.id)

    // Sort children to ensure consistent ordering (e.g. by Y position or ID)
    const childrenNodes = childrenEdges
      .map(e => findNode(e.source))
      .filter(n => n !== undefined)
      .sort((a, b) => a!.position.y - b!.position.y)

    childrenNodes.forEach((child, index) => {
      if (!child || visited.has(child.id)) return
      visited.add(child.id)

      const level = current.level + 1
      let code = ''

      if (current.id === 'goal') {
        // Level 1: A, B, C...
        code = String.fromCharCode(64 + (index + 1))
      } else {
        // Level 2+: ParentCode.Index
        code = `${current.code}.${index + 1}`
      }

      // Update child data
      // We update label to match code if it's the default "New Input" or just to enforce the style
      const newLabel = child.data.label === 'New Input' ? code : child.data.label

      child.data = { ...child.data, level, code, label: newLabel }

      queue.push({ id: child.id, level, code })
    })
  }

  // Calculate weights after tree structure is updated
  recalculateWeights()
}

onConnect((params) => {
  const sourceNode = findNode(params.source)
  const targetNode = findNode(params.target)

  if (!sourceNode || !targetNode) return

  // Inherit color from source if it's not the central node
  const edgeColor = sourceNode.data.color || '#64748b'

  // Also inherit color if it's a new node (optional, but good for consistency)
  if (targetNode.data.type !== 'central' && !targetNode.data.color) {
    targetNode.data = { ...targetNode.data, color: edgeColor }
  }

  addEdges([
    {
      ...params,
      type: 'custom',
      data: { sign: '+', color: edgeColor },
      markerEnd: MarkerType.ArrowClosed,
    },
  ])

  // Recalculate the entire tree structure
  setTimeout(recalculateTree, 100)
})

const addNode = (type: 'central' | 'input') => {
  if (type === 'central') {
    // Check if central exists
    if (nodes.value.find(n => n.data.type === 'central')) return

    addNodes([{
      id: 'goal',
      type: 'custom',
      position: { x: 400, y: 300 },
      data: { label: 'GOAL', type: 'central', shape: 'round', code: 'GOAL', level: 0, color: '#000000', weight: 0, totalWeight: 0 },
    }])
    return
  }

  const id = Math.random().toString(36).substr(2, 9)

  // Inherit color from the last added input node, or default to gray
  let color = '#64748b'
  const inputNodes = nodes.value.filter(n => n.data.type === 'input')
  if (inputNodes.length > 0) {
    const lastNode = inputNodes[inputNodes.length - 1]
    if (lastNode.data.color) {
      color = lastNode.data.color
    }
  }

  addNodes([{
    id,
    type: 'custom',
    position: { x: Math.random() * 600, y: Math.random() * 400 },
    data: {
      label: 'New Input',
      type: 'input',
      shape: 'square',
      color,
      level: 1, // Default level until connected
      weight: 0,
      totalWeight: 0
    },
  }])
}

const onNodeClick = (event: any) => {
  // Check if Ctrl key is pressed (Delete Mode)
  if (isDeleteMode.value) {
    // Prevent deletion of the central GOAL node
    if (event.node.data.type === 'central') {
      return
    }

    // Remove the node
    removeNodes([event.node.id])

    // If the deleted node was selected, close the sidebar
    if (selectedNode.value && selectedNode.value.id === event.node.id) {
      selectedNode.value = null
      sidebarOpen.value = false
    }
    return
  }

  selectedNode.value = event.node
  sidebarOpen.value = true
}

const onEdgeClick = (event: any) => {
  if (isDeleteMode.value) {
    removeEdges([event.edge.id])
  }
}
</script>

<template>
  <div class="diagram-container" :class="{ 'delete-mode': isDeleteMode }">
    <div class="toolbar glass">
      <button @click="sidebarOpen = !sidebarOpen" class="btn-secondary">
        {{ sidebarOpen ? 'Hide List' : 'Show List' }}
      </button>
      <button @click="addNode('central')" class="btn-primary">Add Goal</button>
      <button @click="addNode('input')" class="btn-secondary">Add Input</button>
      <div v-if="isDeleteMode" class="mode-indicator">DELETE MODE</div>
    </div>

    <div class="main-area">
      <VueFlow v-model:nodes="nodes" v-model:edges="edges" :default-viewport="{ zoom: 1 }" :min-zoom="0.2" :max-zoom="4"
        fit-view-on-init @node-click="onNodeClick" @edge-click="onEdgeClick">
        <template #node-custom="props">
          <CustomNode :data="props.data" />
        </template>

        <template #edge-custom="props">
          <CustomEdge v-bind="props" />
        </template>

        <Background pattern-color="#3b82f6" :gap="20" />
        <Controls />
        <MiniMap />
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
              <td class="col-weight" @click.stop>
                <input v-if="editingWeightId === node.id" :value="node.data.totalWeight || 0"
                  @input="(e) => updateNodeWeight(node, Number((e.target as HTMLInputElement).value))" type="number"
                  @blur="stopEditingWeight" @keyup.enter="stopEditingWeight" class="inline-input weight-input"
                  v-focus />
                <span v-else @click="startEditingWeight(node.id)">{{ node.data.totalWeight || 0 }}</span>
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
