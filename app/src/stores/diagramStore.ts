import { ref, watch } from 'vue'

// Singleton state
const nodes = ref<any[]>([
    {
        id: 'goal',
        type: 'custom',
        position: { x: 400, y: 300 },
        data: { label: 'GOAL', type: 'central', shape: 'round', code: 'GOAL', level: 0, color: '#000000', weight: 0, totalWeight: 0 },
    },
])

const edges = ref<any[]>([])
const sidebarOpen = ref(false)
const searchQuery = ref('')
const isLoaded = ref(false) // Flag to prevent overwriting storage before load
const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

export function useDiagramState() {
    const STORAGE_KEY = 'system-diagram-data'

    // --- Actions ---

    const loadFromStorage = () => {
        // Mark as loaded FIRST to allow saves from recalculation
        isLoaded.value = true

        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                const data = JSON.parse(saved)
                // Check if data is valid and NOT just the default empty structure
                if (data.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
                    nodes.value = data.nodes
                    edges.value = data.edges || []

                    setTimeout(recalculateTree, 200)
                }
            } catch (e) {
                console.error('Failed to load diagram data', e)
            }
        }
    }

    const saveToStorage = () => {
        // Prevent saving if we haven't loaded yet (avoids overwriting storage with default state on init)
        if (!isLoaded.value) return

        if (nodes.value.length > 0) {
            const data = {
                nodes: nodes.value,
                edges: edges.value,
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        }
    }

    const recalculateWeights = () => {
        const levels = new Map<number, any[]>()
        let maxLevel = 0

        nodes.value.forEach(node => {
            const level = node.data.level || 0
            if (!levels.has(level)) levels.set(level, [])
            levels.get(level)!.push(node)
            if (level > maxLevel) maxLevel = level
        })

        for (let i = maxLevel; i >= 0; i--) {
            const levelNodes = levels.get(i) || []

            levelNodes.forEach(node => {
                const inputEdges = edges.value.filter(e => e.target === node.id)

                let inherited = 0
                inputEdges.forEach(e => {
                    const sourceNode = nodes.value.find(n => n.id === e.source)
                    if (sourceNode) {
                        const signVal = e.data?.sign === '-' ? -1 : 1
                        inherited += (sourceNode.data.totalWeight || 0) + signVal
                    }
                })

                // Use immutable update to ensure Vue reactivity
                node.data = { ...node.data, totalWeight: (node.data.weight || 0) + inherited }
            })
        }
    }

    const recalculateTree = () => {
        const goalNode = nodes.value.find(n => n.data.type === 'central')
        if (!goalNode) return

        const currentEdges = edges.value

        const queue = [{ id: goalNode.id, level: 0, code: 'GOAL' }]
        const visited = new Set([goalNode.id])

        goalNode.data = { ...goalNode.data, level: 0, code: 'GOAL' }

        while (queue.length > 0) {
            const current = queue.shift()!
            const currentNode = nodes.value.find(n => n.id === current.id)

            const childrenEdges = currentEdges.filter(e => e.target === current.id)

            const childrenNodes = childrenEdges
                .map(e => nodes.value.find(n => n.id === e.source))
                .filter(n => n !== undefined)
                // @ts-ignore
                .sort((a, b) => a!.position.y - b!.position.y)

            childrenNodes.forEach((child, index) => {
                // @ts-ignore
                if (!child || visited.has(child.id)) return
                // @ts-ignore
                visited.add(child.id)

                const level = current.level + 1
                let code = ''
                // @ts-ignore
                let newColor = child.data.color

                if (current.id === 'goal') {
                    code = String.fromCharCode(64 + (index + 1))
                    newColor = colors[index % colors.length]
                } else {
                    code = `${current.code}.${index + 1}`
                    if (currentNode) {
                        newColor = currentNode.data.color
                    }
                }

                // @ts-ignore
                const newLabel = child.data.label === 'New Input' ? code : child.data.label
                // @ts-ignore
                child.data = { ...child.data, level, code, label: newLabel, color: newColor }
                // @ts-ignore
                queue.push({ id: child.id, level, code })
            })
        }

        recalculateWeights()
    }

    const addNode = (type: 'central' | 'input') => {
        if (type === 'central') {
            if (nodes.value.find(n => n.data.type === 'central')) return
            nodes.value = [
                ...nodes.value,
                {
                    id: 'goal',
                    type: 'custom',
                    position: { x: 400, y: 300 },
                    data: { label: 'GOAL', type: 'central', shape: 'round', code: 'GOAL', level: 0, color: '#000000', weight: 0, totalWeight: 0 },
                }
            ]
            return
        }

        const id = Math.random().toString(36).substr(2, 9)
        const color = '#64748b'

        // We add to our ref using immutable assignment
        nodes.value = [
            ...nodes.value,
            {
                id,
                type: 'custom',
                position: { x: Math.random() * 600, y: Math.random() * 400 },
                data: {
                    label: 'New Input',
                    type: 'input',
                    shape: 'square',
                    color,
                    code: '', // Initialize code property
                    level: 1,
                    weight: 0,
                    totalWeight: 0
                },
            }
        ]
    }

    // Watch for changes to persist
    watch([nodes, edges], () => {
        saveToStorage()
    }, { deep: true })

    return {
        nodes,
        edges,
        sidebarOpen,
        searchQuery,
        loadFromStorage,
        saveToStorage,
        recalculateTree,
        recalculateWeights,  // Export this so component can trigger it
        addNode,
        colors
    }
}
