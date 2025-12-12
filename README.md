# Systemic Impact Analysis Tool

A visual tool for modeling and analyzing systemic relationships, designed to evaluate how different inputs and factors influence a central goal.

**🚀 Live Demo:** [https://foxlab-mapsystem.netlify.app/](https://foxlab-mapsystem.netlify.app/) (Demo Mode)

## 🎯 Purpose

This tool allows you to build a **System Map** where multiple input nodes flow into a central "Goal". By assigning weights and defining positive (`+`) or negative (`-`) influences, you can simulate "what-if" scenarios and understand the net impact of various factors on your main objective.

It is particularly useful for:
- **Decision Making**: Evaluating the pros and cons of different strategies.
- **Root Cause Analysis**: Tracing back factors that contribute to a problem.
- **System Modeling**: Visualizing complex dependencies and their aggregate effects.

## ✨ Key Features

### 1. Visual Diagramming
- **Central Goal**: The core objective of your system.
- **Input Nodes**: Factors that influence the goal.
- **Connections**: Visual links showing the flow of influence.

### 2. Dynamic Weight Calculation
- **Recursive Logic**: The value of a node is calculated based on its own "Base Weight" plus the sum of all its children's values.
- **Influence Signs**: Edges can be positive (`+`) or negative (`-`).
    - A `+` connection adds the child's value to the parent.
    - A `-` connection subtracts the child's value from the parent.
- **Real-time Updates**: Changing a weight or toggling a sign immediately propagates changes up the tree to the Goal.

### 3. Hierarchical Coding
- Nodes are automatically numbered (e.g., `A`, `A.1`, `A.1.2`) based on their position in the tree structure, making it easy to reference specific parts of the system.

### 4. Interactive Sidebar
- **Node List**: A sortable, searchable table of all nodes in the system.
- **Inline Editing**:
    - **Label**: Rename nodes directly in the table.
    - **Weight**: Adjust the "Total Weight" of a node. The system automatically calculates the necessary "Base Weight" to achieve your desired total.
- **Color Picker**: Assign colors to nodes to group them visually (e.g., by department, risk level, or category).

## 🛠️ How to Use

### Getting Started
1.  **Add Goal**: Click "Add Goal" to create your central node.
2.  **Add Inputs**: Click "Add Input" to create factors.
3.  **Connect**: Drag from an Input node's handle to a Parent node's handle to connect them.

### Analyzing Impact
1.  **Set Weights**: Open the sidebar ("Show List") and assign weights to your leaf nodes (inputs with no children).
2.  **Define Influence**: Click the `+` / `-` badge on any connection line to toggle its sign.
3.  **Observe**: Watch how the values propagate up to the "GOAL" node.

### Managing the View
- **Toggle Sidebar**: Use the "Show/Hide List" button in the top-left toolbar.
- **Search**: Use the search bar in the sidebar to find specific nodes by name or code.
- **Delete**: Hold `Ctrl` (or `Cmd`) and click a node or edge to delete it.

## 💻 Technical Details

Built with:
- **Astro**: For high-performance web architecture.
- **Vue 3**: For reactive UI components.
- **Vue Flow**: For the interactive diagramming engine.
- **Tailwind CSS**: For styling (if applicable).

### Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Installs dependencies                       |
| `npm run dev`     | Starts local dev server at `localhost:4321` |
| `npm run build`   | Build your production site to `./dist/`     |

## 🚀 Deployment

### Netlify

This project is configured for easy deployment on Netlify.

1.  **Push to Git**: Ensure your project is pushed to a GitHub, GitLab, or Bitbucket repository.
2.  **Connect to Netlify**: Log in to Netlify and click "Add new site" -> "Import an existing project".
3.  **Select Repository**: Choose your repository.
4.  **Configure Build**: Netlify should automatically detect the settings from `netlify.toml`:
    - **Build command**: `npm run build`
    - **Publish directory**: `dist`
5.  **Deploy**: Click "Deploy site".

The `netlify.toml` file included in the root directory handles the configuration automatically.
