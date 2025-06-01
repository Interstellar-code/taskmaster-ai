# PRD Kanban Board for TaskMaster AI

A terminal-based Kanban board for visualizing and managing Product Requirement Documents (PRDs) within the TaskMaster AI ecosystem.

## 🎯 Overview

The PRD Kanban Board provides an interactive, visual interface for managing PRDs through their lifecycle stages. Built with Blessed.js for cross-platform terminal compatibility, it integrates seamlessly with TaskMaster's existing PRD tracking system.

## ✨ Features

### Core Functionality
- **Visual PRD Management**: Interactive Kanban board with 3 status columns (Pending, In-Progress, Done)
- **Real-time Navigation**: Arrow key navigation between columns and PRDs
- **Status Updates**: Number keys (1-3) for quick PRD status changes
- **Quick Operations**: Keyboard shortcuts for common PRD operations

### Keyboard Controls
| Key | Action | Description |
|-----|--------|-------------|
| `←→` | Column Navigation | Move between status columns |
| `↑↓` | PRD Navigation | Move between PRDs within a column |
| `1-3` | Status Update | Move PRD to Pending(1), In-Progress(2), Done(3) |
| `V` | View Details | Show detailed PRD information |
| `T` | Show Tasks | Display linked tasks for selected PRD |
| `S` | Statistics | Show PRD completion statistics |
| `I` | Info | Display PRD metadata in status bar |
| `R` | Refresh | Reload board data |
| `O` | Open Location | Open PRD file location in system explorer |
| `F` | Filter | Filter PRDs by criteria |
| `/` | Search | Search PRDs |
| `C` | Stats | Show board statistics |
| `H` | Help | Display help overlay |
| `Q` | Quit | Exit the Kanban board |
| `ESC` | Hide Details | Close detail overlays |

## 🚀 Getting Started

### Prerequisites
- Node.js v16+ 
- TaskMaster AI project initialized
- PRDs configured in `prd/prds.json`

### Usage

#### Via TaskMaster Menu
```bash
task-master menu
# Navigate to: Project Management > PRD Management > PRD Kanban Board
```

## 🏗️ Architecture

### Component Structure
```
src/prd-kanban/
├── prd-kanban-board.js          # Main board controller
├── components/
│   ├── prd-board-layout.js      # Board layout and column management
│   └── prd-card.js              # PRD card rendering
├── handlers/
│   ├── navigation-handler.js    # Keyboard navigation
│   ├── status-update-handler.js # PRD status updates
│   ├── quick-operations-handler.js # Quick operations (V,T,S,I,R,O)
│   └── board-controls.js        # Board controls (F,/,C,H)
└── tests/                       # Comprehensive test suite
```

### Data Flow
1. **Initialization**: Load PRDs from `prd/prds.json`
2. **Layout**: Distribute PRDs across status columns
3. **Interaction**: Handle keyboard input and update state
4. **Persistence**: Save changes back to JSON and file system
5. **Refresh**: Reload data and update display

## 🎨 UI Design

### Column Layout
```
┌─────────────┬─────────────┬─────────────┐
│   Pending   │ In-Progress │    Done     │
│     (1)     │     (2)     │     (3)     │
├─────────────┼─────────────┼─────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │ PRD_001 │ │ │ PRD_006 │ │ │ PRD_002 │ │
│ │ Title   │ │ │ Title   │ │ │ Title   │ │
│ │ P:High  │ │ │ P:Med   │ │ │ P:High  │ │
│ │ C:3/5   │ │ │ C:4/5   │ │ │ C:5/5   │ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │
│             │             │ ┌─────────┐ │
│             │             │ │ PRD_003 │ │
│             │             │ │ Title   │ │
│             │             │ │ P:Low   │ │
│             │             │ │ C:5/5   │ │
│             │             │ └─────────┘ │
└─────────────┴─────────────┴─────────────┘
```

### PRD Card Format
```
┌─────────────────────┐
│ PRD_001             │ ← PRD ID
│ TaskMaster Lifecycle│ ← Title (truncated)
│ Priority: High      │ ← Priority
│ Complexity: 3/5     │ ← Complexity rating
│ Tasks: 12/15 (80%)  │ ← Task completion
│ Modified: 2024-01-15│ ← Last modified
└─────────────────────┘
```

## 🔧 Configuration

### Column Customization
The board uses a 3-column layout by default:
- **Pending**: New PRDs awaiting work
- **In-Progress**: PRDs currently being developed
- **Done**: Completed PRDs

### Status Mappings
```javascript
{
  '1': 'pending',
  '2': 'in-progress', 
  '3': 'done'
}
```

## 🧪 Testing

### Test Suite
```bash
# Cross-platform testing
node src/prd-kanban/test-cross-platform.js

# Integration testing
node src/prd-kanban/test-integration.js

# Component tests
node src/prd-kanban/test-navigation.js
node src/prd-kanban/test-status-updates.js
node src/prd-kanban/test-quick-operations.js
```

### Platform Compatibility
- ✅ **Windows**: PowerShell, Command Prompt, Windows Terminal
- ✅ **macOS**: Terminal.app, iTerm2
- ✅ **Linux**: GNOME Terminal, Konsole, xterm

## 🔗 Integration

### TaskMaster Integration
- **PRD Data**: Reads from `prd/prds.json`
- **Task Linking**: Shows linked tasks via TaskMaster utilities
- **File Organization**: Moves PRD files between status directories
- **Menu System**: Integrated into TaskMaster interactive menu

### Data Consistency
- **Bidirectional Sync**: Changes reflect in both Kanban and CLI
- **File System**: Automatic PRD file organization
- **JSON Updates**: Real-time metadata updates
- **Validation**: Data integrity checks

## 🚨 Troubleshooting

### Common Issues

#### No PRDs Visible
- **Cause**: Empty PRD columns or missing `prd/prds.json`
- **Solution**: Run `task-master prd-migrate` to import existing PRDs

#### Navigation Not Working
- **Cause**: No PRDs in current column
- **Solution**: Use arrow keys to find columns with PRDs

#### Keyboard Input Issues
- **Cause**: Terminal compatibility or TERM environment
- **Solution**: Use supported terminal or set TERM variable

#### Display Issues
- **Cause**: Terminal size too small
- **Solution**: Resize terminal to minimum 80x24

## 📈 Performance

### Benchmarks
- **Load Time**: < 1 second for 100+ PRDs
- **Memory Usage**: < 50MB heap allocation
- **Responsiveness**: < 100ms keyboard response

## 🔮 Future Enhancements

### Planned Features
- Drag-and-drop PRD movement
- Custom column configurations
- PRD filtering and search
- Export capabilities
- Multi-project support

## 📝 Contributing

### Development Setup
1. Clone TaskMaster AI repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Start development: `task-master menu`

### Code Style
- ES modules (import/export)
- Async/await for promises
- JSDoc comments for functions
- Comprehensive error handling

## 📄 License

Part of TaskMaster AI - see main project license.

## 🙏 Acknowledgments

- **Blessed.js**: Terminal UI framework
- **TaskMaster AI**: Core project infrastructure
- **Chalk**: Terminal styling
- **Node.js**: Runtime environment
