// Simple Emoji Picker Implementation

class EmojiPicker {
    constructor() {
        // Simplified emoji list with fewer categories and emojis
        this.emojis = {
            'Smileys': [
                '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰'
            ],
            'Gestures': [
                '👍', '👎', '👌', '✌️', '🤞', '👋', '🤚', '✋', '👏', '🙌', '👐', '🤲', '🙏'
            ],
            'Animals': [
                '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'
            ],
            'Food': [
                '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🍔', '🍟', '🍕', '🌭', '🥪'
            ],
            'Hearts': [
                '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖'
            ]
        };
        
        this.activeButton = null;
        this.activeContainer = null;
        this.init();
    }
    
    init() {
        console.log('Initializing emoji picker - simplified version');
        
        // Add CSS link to head if not already added
        if (!document.querySelector('link[href="emoji-picker.css"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'emoji-picker.css';
            document.head.appendChild(cssLink);
            console.log('Added CSS link');
        }
        
        // Direct approach - find all emoji buttons and attach event listeners
        document.addEventListener('click', (e) => {
            // Check if the clicked element is an emoji button or contains the emoji icon
            const emojiButton = e.target.closest('.chat-mini-icon-btn[title="Biểu tượng cảm xúc"]') || 
                               (e.target.classList.contains('far') && 
                                e.target.classList.contains('fa-smile') && 
                                e.target.closest('.chat-mini-icon-btn'));
            
            if (emojiButton) {
                console.log('Emoji button clicked');
                e.preventDefault();
                e.stopPropagation();
                this.toggleEmojiPicker(emojiButton);
            }
        });
        
        console.log('Emoji picker initialized with global click handler');
        
        // Close emoji picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.emoji-picker-container') && 
                !e.target.closest('.chat-mini-icon-btn[title="Biểu tượng cảm xúc"]')) {
                this.closeAllPickers();
            }
        });
    }
    
    createEmojiPicker() {
        console.log('Creating emoji picker');
        
        // Create container
        const container = document.createElement('div');
        container.className = 'emoji-picker-container';
        container.id = 'emoji-picker-' + Date.now(); // Unique ID
        
        // Add search input
        const searchDiv = document.createElement('div');
        searchDiv.className = 'emoji-search';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Tìm kiếm emoji...';
        searchInput.addEventListener('input', (e) => this.searchEmojis(e.target.value, container));
        searchDiv.appendChild(searchInput);
        container.appendChild(searchDiv);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'emoji-picker-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeAllPickers();
        });
        container.appendChild(closeButton);
        
        console.log('Emoji picker created with ID:', container.id);
        
        // Add emoji categories
        for (const [category, emojiList] of Object.entries(this.emojis)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'emoji-category';
            categoryDiv.dataset.category = category;
            
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'emoji-category-title';
            categoryTitle.textContent = category;
            categoryDiv.appendChild(categoryTitle);
            
            const emojiGrid = document.createElement('div');
            emojiGrid.className = 'emoji-grid';
            
            emojiList.forEach(emoji => {
                const emojiItem = document.createElement('div');
                emojiItem.className = 'emoji-item';
                emojiItem.textContent = emoji;
                emojiItem.addEventListener('click', () => this.selectEmoji(emoji));
                emojiGrid.appendChild(emojiItem);
            });
            
            categoryDiv.appendChild(emojiGrid);
            container.appendChild(categoryDiv);
        }
        
        return container;
    }
    
    toggleEmojiPicker(button) {
        console.log('Toggle emoji picker called - super simplified');
        
        // Close any open pickers first
        this.closeAllPickers();
        
        // Get the chat window containing this button
        const chatWindow = button.closest('.chat-mini-window');
        if (!chatWindow) {
            console.error('Chat window not found');
            return;
        }
        
        // Get the input field
        const inputField = chatWindow.querySelector('.chat-mini-window-input input');
        if (!inputField) {
            console.error('Input field not found');
            return;
        }
        
        // Create a simple popup with emojis
        const container = document.createElement('div');
        container.className = 'emoji-picker-container';
        
        // Add emojis directly
        const emojiList = [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
            '👍', '👎', '👌', '✌️', '🤞', '👋', '❤️', '🧡', '💛', '💚'
        ];
        
        // Create a simple grid
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
        grid.style.gap = '10px';
        grid.style.padding = '10px';
        
        // Add emojis to grid
        emojiList.forEach(emoji => {
            const emojiItem = document.createElement('div');
            emojiItem.style.fontSize = '24px';
            emojiItem.style.textAlign = 'center';
            emojiItem.style.cursor = 'pointer';
            emojiItem.textContent = emoji;
            emojiItem.addEventListener('click', () => {
                // Insert emoji at cursor position
                const cursorPos = inputField.selectionStart || 0;
                const textBefore = inputField.value.substring(0, cursorPos);
                const textAfter = inputField.value.substring(cursorPos);
                
                inputField.value = textBefore + emoji + textAfter;
                inputField.focus();
                
                // Close the picker
                this.closeAllPickers();
            });
            grid.appendChild(emojiItem);
        });
        
        container.appendChild(grid);
        
        // Style the container directly
        Object.assign(container.style, {
            position: 'absolute',
            top: (button.offsetTop - 200) + 'px',
            left: button.offsetLeft + 'px',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '5px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            zIndex: '9999',
            width: '200px'
        });
        
        // Add to DOM - append to chat window instead of body
        chatWindow.appendChild(container);
        
        // Store references
        this.activeButton = button;
        this.activeContainer = container;
        
        console.log('Emoji picker toggled - super simplified');
    }
    
    closeAllPickers() {
        console.log('Closing all pickers - super simplified');
        const pickers = document.querySelectorAll('.emoji-picker-container');
        
        if (pickers.length === 0) {
            console.log('No pickers found to close');
            return;
        }
        
        pickers.forEach(picker => {
            // Remove picker immediately
            if (picker && picker.parentNode) {
                picker.parentNode.removeChild(picker);
                console.log('Picker removed');
            }
        });
        
        // Clear active references
        this.activeButton = null;
        this.activeContainer = null;
    }
    
    selectEmoji(emoji) {
        console.log('Emoji selected:', emoji);
        
        if (!this.activeButton) {
            console.error('No active button found');
            return;
        }
        
        // Get the chat window containing the active button
        const chatWindow = this.activeButton.closest('.chat-mini-window');
        if (!chatWindow) {
            console.error('Chat window not found');
            return;
        }
        
        // Get the input field
        const inputField = chatWindow.querySelector('.chat-mini-window-input input');
        if (!inputField) {
            console.error('Input field not found');
            return;
        }
        
        console.log('Found input field:', inputField);
        
        // Insert emoji at cursor position
        const cursorPos = inputField.selectionStart || 0;
        const textBefore = inputField.value.substring(0, cursorPos);
        const textAfter = inputField.value.substring(cursorPos);
        
        // Update input value
        inputField.value = textBefore + emoji + textAfter;
        console.log('Updated input value:', inputField.value);
        
        // Set cursor position after the inserted emoji
        const newCursorPos = cursorPos + emoji.length;
        try {
            inputField.setSelectionRange(newCursorPos, newCursorPos);
        } catch (e) {
            console.error('Error setting selection range:', e);
        }
        
        // Focus back on input field
        inputField.focus();
        
        // Trigger input event to notify any listeners
        const inputEvent = new Event('input', { bubbles: true });
        inputField.dispatchEvent(inputEvent);
        
        // Close the picker
        this.closeAllPickers();
    }
    
    searchEmojis(query, container) {
        console.log('Searching emojis:', query);
        
        if (!container) {
            console.error('Container not provided for search');
            return;
        }
        
        if (!query) {
            // Show all categories if query is empty
            container.querySelectorAll('.emoji-category').forEach(category => {
                category.style.display = 'block';
            });
            console.log('Showing all categories');
            return;
        }
        
        query = query.toLowerCase();
        
        // Loop through all categories and emoji items
        for (const [categoryName, emojiList] of Object.entries(this.emojis)) {
            const categoryElement = container.querySelector(`.emoji-category[data-category="${categoryName}"]`);
            if (!categoryElement) {
                console.warn(`Category element not found: ${categoryName}`);
                continue;
            }
            
            // Check if category name matches the query
            const categoryMatches = categoryName.toLowerCase().includes(query);
            
            // Show/hide the category based on matches
            categoryElement.style.display = categoryMatches ? 'block' : 'none';
            
            if (categoryMatches) {
                console.log(`Category matches: ${categoryName}`);
            }
        }
        
        console.log('Search complete');
    }
}

// Global instance to avoid multiple initializations
let emojiPickerInstance = null;

// Initialize the emoji picker when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - initializing emoji picker');
    if (!emojiPickerInstance) {
        emojiPickerInstance = new EmojiPicker();
    }
});

// Also initialize immediately in case the page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('Document already loaded - initializing emoji picker now');
    setTimeout(() => {
        if (!emojiPickerInstance) {
            emojiPickerInstance = new EmojiPicker();
        }
    }, 500);
}

// Re-initialize when new chat windows are created
function initEmojiPickerForNewWindows() {
    console.log('Initializing emoji picker for new windows');
    // Always reinitialize for new windows
    emojiPickerInstance = new EmojiPicker();
}

// Make sure emoji picker is initialized when this script loads
console.log('Emoji picker script loaded');
setTimeout(() => {
    if (!emojiPickerInstance) {
        console.log('Initializing emoji picker on script load');
        emojiPickerInstance = new EmojiPicker();
    }
}, 1000);