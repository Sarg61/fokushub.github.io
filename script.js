// --- Global Variables ---
let activeTaskId = null;
let taskSessionStartTime = null;
let timerRunning = false;
let manualTaskClear = false;
// Use the main app's timer system instead of creating a duplicate
function stopTimer() {
    // This function will be called by the main timer system
    // No need to manage a separate timer here
}

// IST Clock functionality
function updateISTClock() {
    // Get current UTC time
    const now = new Date();

    // IST is UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    // Format time as HH:MM:SS
    const hours = String(istTime.getUTCHours()).padStart(2, '0');
    const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istTime.getUTCSeconds()).padStart(2, '0');

    // Format date as e.g. "Mon, 17 Jun"
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    const dateStr = istTime.toLocaleDateString('en-IN', options);

    // Update DOM elements
    const clockEl = document.getElementById('ist-clock');
    const dateEl = document.getElementById('ist-date');

    if (clockEl) {
        clockEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
    if (dateEl) {
        dateEl.textContent = dateStr;
    }
}
// Initialize IST clock when DOM is ready
function initializeISTClock() {
    updateISTClock();
    setInterval(updateISTClock, 1000);
}

// --- Quote Management ---
const quotes = [
    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" }
];

function fetchQuote() {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const quoteTextEl = document.getElementById('quote-text');
    const quoteAuthorEl = document.getElementById('quote-author');

    if (quoteTextEl && quoteAuthorEl) {
        quoteTextEl.textContent = randomQuote.text;
        quoteAuthorEl.textContent = `— ${randomQuote.author}`;
    }
}
// Initialize quotes
function initializeQuotes() {
    fetchQuote();
}

// --- Task Management ---
function renderTasks() {
    const taskListEl = document.getElementById('task-list');
    const taskProgressEl = document.getElementById('task-progress');

    if (!taskListEl) {
        console.log('Task list element not found');
        return;
    }

    if (!window.localState?.todos || window.localState.todos.length === 0) {
        if (taskProgressEl) {
            taskProgressEl.textContent = '0/0 Completed';
        }
        taskListEl.innerHTML = '<li class="text-gray-400 text-center py-4">No tasks yet. Add one above!</li>';
        return;
    }

    const todos = window.localState.todos;
    taskListEl.innerHTML = '';

    const completedCount = todos.filter(t => t.completed).length;
    if (taskProgressEl) {
        taskProgressEl.textContent = `${completedCount}/${todos.length} Completed`;
    }

    // Sort tasks by priority and completion status
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const sortedTodos = todos.sort((a, b) => {
        // First sort by completion status (incomplete tasks first)
        if (a.completed !== b.completed) {
            return a.completed - b.completed;
        }
        // Then sort by priority (higher priority first)
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
    });

    sortedTodos.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item flex items-center justify-between p-4 bg-gray-700 rounded-lg border-l-4 ${getPriorityClass(task.priority)}`;

        const timeSpent = formatTime(task.timeSpent || 0);

        li.innerHTML = `
            <div class="flex items-center flex-grow">
                <div class="flex-grow">
                    <span class="${task.completed ? 'line-through text-gray-400' : 'text-gray-100'}">${escapeHTML(task.text)}</span>
                    <div class="text-xs text-gray-400 mt-1 flex items-center">
                        <span>Time spent: ${timeSpent}</span>
                        <span class="mx-2">|</span>
                        <span class="flex items-center">
                            Priority: 
                            <span class="ml-1 px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadgeClass(task.priority)}">
                                ${task.priority.toUpperCase()}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                ${!task.completed ? 
                    `<button class="finish-task-btn px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                             data-task-id="${task.id}">
                        Finish
                     </button>` : 
                    `<span class="px-3 py-1 bg-green-800 text-green-200 text-sm rounded">
                        Finished
                     </span>`}
                ${!task.completed && activeTaskId !== task.id ? 
                    `<button class="start-task-btn px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
                             data-task-id="${task.id}">
                        Start
                     </button>` : ''}
                ${activeTaskId === task.id ? 
                    `<button class="stop-task-btn px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition">
                        Stop
                     </button>` : ''}
                <button class="remove-task-btn px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                        data-task-id="${task.id}">
                    Remove
                </button>
            </div>
        `;

        taskListEl.appendChild(li);
    });

    // Add event listeners to the new elements
    setupTaskEventListeners();
}

function getPriorityClass(priority) {
    const classes = {
        low: 'border-green-500',
        medium: 'border-yellow-500', 
        high: 'border-orange-500',
        urgent: 'border-red-500 bg-red-900/20'
    };
    return classes[priority] || classes.low;
}

function getPriorityBadgeClass(priority) {
    const classes = {
        low: 'bg-green-800 text-green-200',
        medium: 'bg-yellow-800 text-yellow-200',
        high: 'bg-orange-800 text-orange-200',
        urgent: 'bg-red-800 text-red-200'
    };
    return classes[priority] || classes.low;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function startTaskSession(taskId) {
    // Clear any existing active task first
    if (activeTaskId) {
        clearActiveTask(false);
    }

    activeTaskId = taskId;
    taskSessionStartTime = Date.now();

    // Start the main timer automatically if not already running
    const startStopBtn = document.getElementById('start-stop-btn');
    if (startStopBtn && startStopBtn.textContent === 'START') {
        // Trigger the main timer's start function
        startStopBtn.click();
    }

    const task = window.localState.todos.find(t => t.id === taskId);
    if (task) {
        const activeTaskDisplay = document.getElementById('active-task-display');
        const activeTaskName = document.getElementById('active-task-name');
        const taskSessionTime = document.getElementById('task-session-time');

        if (activeTaskDisplay && activeTaskName && taskSessionTime) {
            activeTaskDisplay.classList.remove('hidden');
            activeTaskName.textContent = task.text;
            taskSessionTime.textContent = '0s';
        }

        renderTasks();
    }
}

// ...existing code...
function clearActiveTask(manual = false) {
    if (!activeTaskId) return;

    manualTaskClear = manual;

    // Stop the timer automatically if stopping (not finishing)
    if (!manual) {
        const startStopBtn = document.getElementById('start-stop-btn');
        if (startStopBtn && startStopBtn.textContent === 'PAUSE') {
            startStopBtn.click(); // This will pause the main timer
        }
    }

    // Update time spent on the task
    if (taskSessionStartTime) {
        const timeSpent = Math.floor((Date.now() - taskSessionStartTime) / 1000);
        const taskIndex = window.localState.todos.findIndex(t => t.id === activeTaskId);

        if (taskIndex !== -1) {
            window.localState.todos[taskIndex].timeSpent = (window.localState.todos[taskIndex].timeSpent || 0) + timeSpent;
            if (typeof window.updateFirestore === 'function') {
                try {
                    window.updateFirestore({ todos: window.localState.todos });
                } catch (error) {
                    console.log('Firestore update skipped:', error);
                }
            }
        }
    }

    activeTaskId = null;
    taskSessionStartTime = null;

    const activeTaskDisplay = document.getElementById('active-task-display');
    if (activeTaskDisplay) {
        activeTaskDisplay.classList.add('hidden');
    }

    renderTasks();

    setTimeout(() => {
        manualTaskClear = false;
    }, 1000);
}

function updateTaskSessionTime() {
    if (activeTaskId && taskSessionStartTime) {
        const elapsed = Math.floor((Date.now() - taskSessionStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        const taskSessionTime = document.getElementById('task-session-time');
        if (taskSessionTime) {
            if (minutes > 0) {
                taskSessionTime.textContent = `${minutes}m ${seconds}s`;
            } else {
                taskSessionTime.textContent = `${seconds}s`;
            }
        }
    }
}

// Monitor timer state and auto-clear tasks when timer stops
function monitorTimerState() {
    const startStopBtn = document.getElementById('start-stop-btn');
    if (!startStopBtn) {
        // Retry after a delay if button isn't found
        setTimeout(monitorTimerState, 1000);
        return;
    }

    let lastButtonText = startStopBtn.textContent;

    const checkTimer = setInterval(() => {
        const currentBtn = document.getElementById('start-stop-btn');
        if (!currentBtn) {
            clearInterval(checkTimer);
            return;
        }

        const currentButtonText = currentBtn.textContent;

        if (currentButtonText !== lastButtonText) {
            const wasRunning = lastButtonText === 'PAUSE';
            const isRunning = currentButtonText === 'PAUSE';

            // Update global timer state
            timerRunning = isRunning;

            // If timer stopped and we have an active task, auto-clear it
            if (wasRunning && !isRunning && activeTaskId && !manualTaskClear) {
                setTimeout(() => {
                    clearActiveTask(false);
                }, 500);
            }

            lastButtonText = currentButtonText;
        }
    }, 1000);
}

// Setup event listeners for task interactions using event delegation
function setupTaskEventListeners() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;

    // Check if listeners are already set up to prevent duplicates
    if (taskList.dataset.listenersSetup === 'true') return;

    // Use event delegation for better performance and to avoid duplicate listeners
    taskList.addEventListener('click', function(e) {
        const target = e.target;
        let taskId = target.dataset.taskId;

        if (target.classList.contains('task-checkbox')) {
            handleToggleTask(taskId);
        } else if (target.classList.contains('start-task-btn')) {
            startTaskSession(taskId);
        } else if (target.classList.contains('stop-task-btn')) {
            clearActiveTask(false);
        } else if (target.classList.contains('remove-task-btn')) {
            // Handle delete button clicks - check both the icon and button
            handleDeleteTask(taskId);
        } else if (target.classList.contains('finish-task-btn')){
            handleToggleTask(taskId);
        }
    });

    // Mark listeners as set up
    taskList.dataset.listenersSetup = 'true';
}


// Wrapper functions to prevent conflicts
function handleToggleTask(taskId) {
    if (!window.localState?.todos) return;

    const taskIndex = window.localState.todos.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    // Store the previous completion status
    const wasCompleted = window.localState.todos[taskIndex].completed;

    // Toggle the task completion status
    window.localState.todos[taskIndex].completed = !window.localState.todos[taskIndex].completed;

    // Update Firestore safely
    if (typeof window.updateFirestore === 'function') {
        try {
            window.updateFirestore({ todos: window.localState.todos });
        } catch (error) {
            console.log('Firestore update skipped:', error);
        }
    }

    // If this task is currently active and being completed, stop timer
    if (activeTaskId === taskId) {
        const task = window.localState.todos[taskIndex];
        if (task && task.completed && !wasCompleted) {
            // Task was just completed - only stop the timer, don't reset
            const startStopBtn = document.getElementById('start-stop-btn');

            // Stop the timer if it's running
            if (startStopBtn && startStopBtn.textContent === 'PAUSE') {
                startStopBtn.click();
            }
        }
        clearActiveTask(false);
    }

    // Re-render tasks
    renderTasks();
}
function handleDeleteTask(taskId) {
    if (!taskId || !window.localState?.todos) return;

    // Find and remove the task
    const taskIndex = window.localState.todos.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const taskToDelete = window.localState.todos[taskIndex];

    // Always reset the timer when deleting any task
    const startStopBtn = document.getElementById('start-stop-btn');
    const resetBtn = document.getElementById('reset-btn');

    // If this task is currently active, clear it first
    if (activeTaskId === taskId) {
        clearActiveTask(false);
    }

    // Stop the timer if it's running
    if (startStopBtn && startStopBtn.textContent === 'PAUSE') {
        startStopBtn.click();
    }

    // Reset the timer after a short delay
    setTimeout(() => {
        if (resetBtn) {
            resetBtn.click();
        }
    }, 200);

    // Preserve task in deletedTasks array if it has time spent
    if (taskToDelete.timeSpent && taskToDelete.timeSpent > 0) {
        if (!window.localState.deletedTasks) {
            window.localState.deletedTasks = [];
        }

        // Add to deleted tasks with deletion timestamp
        const deletedTask = {
            ...taskToDelete,
            deletedAt: new Date().toISOString()
        };

        window.localState.deletedTasks.push(deletedTask);
    }

    // Remove the task from the active array
    window.localState.todos.splice(taskIndex, 1);

    // Update Firestore safely
    if (typeof window.updateFirestore === 'function') {
        try {
            window.updateFirestore({ 
                todos: window.localState.todos,
                deletedTasks: window.localState.deletedTasks || []
            });
        } catch (error) {
            console.log('Firestore update skipped:', error);
        }
    }

    // Re-render tasks
    renderTasks();
}

// --- Progress Dashboard ---
function openProgressModal() {
    const modal = document.getElementById('progress-modal');
    if (modal) {
        modal.classList.remove('hidden');
        updateProgressData();
        setupProgressTabs();
    }
}

function setupProgressTabs() {
    const tabs = document.querySelectorAll('.progress-tab');
    const contents = document.querySelectorAll('.progress-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update tab styles
            tabs.forEach(t => {
                t.classList.remove('bg-indigo-600', 'text-white', 'border-b-2', 'border-indigo-400');
                t.classList.add('text-gray-300', 'hover:text-white', 'hover:bg-gray-700');
            });

            tab.classList.add('bg-indigo-600', 'text-white', 'border-b-2', 'border-indigo-400');
            tab.classList.remove('text-gray-300', 'hover:text-white', 'hover:bg-gray-700');

            // Update content visibility
            contents.forEach(content => {
                content.classList.add('hidden');
            });

            const targetContent = document.getElementById(`${targetTab}-content`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }

            // Update data based on selected tab
            if (targetTab === 'overview') {
                updateProgressData();
            } else if (targetTab === 'tasks') {
                updateTaskBreakdown();
            } else if (targetTab === 'activity') {
                updateRecentActivity();
            }
        });
    });
}

function updateProgressData() {
    // Get stored session data
    const sessions = JSON.parse(localStorage.getItem('focusSessions') || '[]');
    const todos = window.localState?.todos || [];

    // Calculate time stats
    const now = new Date();
    const today = now.toDateString();
    const thisWeek = getWeekStart(now);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayTime = 0, weekTime = 0, monthTime = 0, totalTime = 0, totalSessions = 0;

    sessions.forEach(session => {
        const sessionDate = new Date(session.date);
        const duration = session.duration || 0;

        totalTime += duration;
        totalSessions++;

        if (sessionDate.toDateString() === today) {
            todayTime += duration;
        }

        if (sessionDate >= thisWeek) {
            weekTime += duration;
        }

        if (sessionDate >= thisMonth) {
            monthTime += duration;
        }
    });

    // Update time displays safely
    const todayEl = document.getElementById('today-time');
    const weekEl = document.getElementById('week-time');
    const monthEl = document.getElementById('month-time');
    const totalEl = document.getElementById('total-time');
    const avgEl = document.getElementById('avg-session');
    const sessionsEl = document.getElementById('total-sessions');
    const scoreEl = document.getElementById('productivity-score');

    if (todayEl) todayEl.textContent = formatDuration(todayTime);
    if (weekEl) weekEl.textContent = formatDuration(weekTime);
    if (monthEl) monthEl.textContent = formatDuration(monthTime);
    if (totalEl) totalEl.textContent = formatDuration(totalTime);

    // Calculate additional stats
    const avgSession = totalSessions > 0 ? Math.floor(totalTime / totalSessions / 60) : 0;
    if (avgEl) avgEl.textContent = `${avgSession}m`;
    if (sessionsEl) sessionsEl.textContent = totalSessions;

    // Calculate productivity score
    const completedTasks = todos.filter(t => t.completed).length;
    const productivityScore = todos.length > 0 ? Math.round((completedTasks / todos.length) * 100) : 0;
    if (scoreEl) scoreEl.textContent = `${productivityScore}%`;
}



function updateTaskBreakdown() {
    const todos = window.localState?.todos || [];
    const deletedTasks = window.localState?.deletedTasks || [];
    const taskBreakdown = document.getElementById('task-breakdown');

    if (!taskBreakdown) return;

    // Combine active and deleted tasks
    const allTasks = [
        ...todos,
        ...deletedTasks
    ];

    if (allTasks.length === 0) {
        taskBreakdown.innerHTML = '<p class="text-gray-400 text-center py-8">No tasks found</p>';
        return;
    }

    // Filter tasks with time spent
    const tasksWithTime = allTasks.filter(task => (task.timeSpent || 0) > 0);

    if (tasksWithTime.length === 0) {
        taskBreakdown.innerHTML = '<p class="text-gray-400 text-center py-8">No time tracked yet</p>';
        return;
    }

    // Merge duplicate tasks by combining their time spent
    const mergedTasks = {};

    tasksWithTime.forEach(task => {
        const taskName = task.text.trim().toLowerCase();

        if (mergedTasks[taskName]) {
            // Merge time spent
            mergedTasks[taskName].timeSpent += (task.timeSpent || 0);

            // Keep track of status priority: Active > Completed > Deleted
            if (!task.deletedAt && !task.completed) {
                // Active task takes priority
                mergedTasks[taskName].status = 'active';
                mergedTasks[taskName].completed = false;
                mergedTasks[taskName].deletedAt = undefined;
            } else if (!mergedTasks[taskName].deletedAt && task.completed && !mergedTasks[taskName].status) {
                // Completed task (if no active task exists)
                mergedTasks[taskName].status = 'completed';
                mergedTasks[taskName].completed = true;
            } else if (task.deletedAt && !mergedTasks[taskName].status) {
                // Deleted task (lowest priority)
                mergedTasks[taskName].status = 'deleted';
                mergedTasks[taskName].deletedAt = task.deletedAt;
            }

            // Use highest priority among merged tasks
            const priorities = { urgent: 4, high: 3, medium: 2, low: 1 };
            const currentPriority = priorities[mergedTasks[taskName].priority] || 1;
            const newPriority = priorities[task.priority] || 1;

            if (newPriority > currentPriority) {
                mergedTasks[taskName].priority = task.priority;
            }
        } else {
            // First occurrence of this task name
            mergedTasks[taskName] = {
                text: task.text, // Keep original case
                timeSpent: task.timeSpent || 0,
                priority: task.priority,
                completed: task.completed,
                deletedAt: task.deletedAt,
                status: task.deletedAt ? 'deleted' : (task.completed ? 'completed' : 'active')
            };
        }
    });

    // Convert to array and sort by time spent
    const sortedTasks = Object.values(mergedTasks)
        .sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0));

    const maxTime = Math.max(...sortedTasks.map(t => t.timeSpent || 0));

    taskBreakdown.innerHTML = sortedTasks.map(task => {
        const timeSpent = task.timeSpent || 0;
        const percentage = (timeSpent / maxTime) * 100;
        const timeStr = formatTime(timeSpent);
        const isDeleted = task.deletedAt !== undefined;

        return `
            <div class="bg-gray-600/50 p-4 rounded-lg ${isDeleted ? 'border border-red-500/30' : ''}">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-gray-200 truncate flex-1 mr-4 ${isDeleted ? 'opacity-75' : ''}">${escapeHTML(task.text)}</span>
                    <span class="text-indigo-400 font-semibold">${timeStr}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div class="bg-gradient-to-r ${isDeleted ? 'from-red-500 to-red-400' : 'from-indigo-500 to-indigo-400'} h-2 rounded-full transition-all duration-500" 
                         style="width: ${percentage}%"></div>
                </div>
                <div class="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Priority: ${task.priority}</span>
                    <span>${isDeleted ? 'Deleted' : (task.completed ? 'Completed' : 'In Progress')}</span>
                </div>
            </div>
        `;
    }).join('');
}

function updateRecentActivity() {
    const sessions = JSON.parse(localStorage.getItem('focusSessions') || '[]');
    const recentActivity = document.getElementById('recent-activity');

    if (!recentActivity) return;

    const recentSessions = sessions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    if (recentSessions.length === 0) {
        recentActivity.innerHTML = '<p class="text-gray-400 text-center py-8">No activity yet</p>';
        return;
    }

    recentActivity.innerHTML = recentSessions.map(session => {
        const date = new Date(session.date);
        const timeStr = formatDuration(session.duration || 0);
        const taskName = session.taskName || 'General Focus';

        return `
            <div class="bg-gray-600/50 p-4 rounded-lg flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="bg-green-500/20 p-2 rounded-lg">
                        <i class="fas fa-clock text-green-400"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-200">${escapeHTML(taskName)}</div>
                        <div class="text-sm text-gray-400">${date.toLocaleDateString()} at ${date.toLocaleTimeString()}</div>
                    </div>
                </div>
                <div class="text-indigo-400 font-semibold">${timeStr}</div>
            </div>
        `;
    }).join('');
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function setupThemeEventListeners() {
    const themeOptions = document.querySelectorAll('.theme-option');
    if (themeOptions.length === 0) {
        // Retry after a delay if theme options aren't found
        setTimeout(setupThemeEventListeners, 500);
        return;
    }

    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
}

function setupSettingsTabs() {
    const settingsTabs = document.querySelectorAll('.settings-tab');
    if (settingsTabs.length === 0) {
        // Retry after a delay if tabs aren't found
        setTimeout(setupSettingsTabs, 500);
        return;
    }

    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            settingsTabs.forEach(t => {
                t.classList.remove('bg-indigo-600', 'text-white');
                t.classList.add('text-gray-300', 'hover:text-white', 'hover:bg-gray-600');
            });

            tab.classList.add('bg-indigo-600', 'text-white');
            tab.classList.remove('text-gray-300', 'hover:text-white', 'hover:bg-gray-600');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });

            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Make functions globally accessible
window.renderTasks = renderTasks;
window.startTaskSession = startTaskSession;
window.clearActiveTask = clearActiveTask;
window.updateTaskSessionTime = updateTaskSessionTime;
window.handleToggleTask = handleToggleTask;
window.handleDeleteTask = handleDeleteTask;
window.openProgressModal = openProgressModal;
window.fetchQuote = fetchQuote;
window.updateISTClock = updateISTClock;

// Initialize script when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Focus Hub...');

    // Initialize core features
    try {
        // Initialize quote system
        fetchQuote();
        console.log('Quote system initialized');

        // Initialize IST clock
        updateISTClock();
        setInterval(updateISTClock, 1000);
        console.log('IST clock initialized');

        // Update task session time every second
        setInterval(updateTaskSessionTime, 1000);

        // Monitor timer state for auto task clearing
        setTimeout(monitorTimerState, 2000);

        // Setup event listeners with error handling
        setupThemeEventListeners();
        setupSettingsTabs();
        console.log('Event listeners initialized');

        // Setup progress modal event listeners
        const progressBtn = document.getElementById('progress-report-btn');
        const progressCloseBtn = document.getElementById('progress-close-btn');

        if (progressBtn) {
            progressBtn.addEventListener('click', openProgressModal);
        }

        if (progressCloseBtn) {
            progressCloseBtn.addEventListener('click', () => {
                const modal = document.getElementById('progress-modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        }

        // Initialize task system
        const checkAndRenderTasks = () => {
            if (window.localState) {
                if (!window.localState.todos) {
                    window.localState.todos = [];
                }
                renderTasks();
                console.log('Tasks rendered');
            } else {
                setTimeout(checkAndRenderTasks, 200);
            }
        };

        // Start checking immediately
        checkAndRenderTasks();

        // Listen for state changes and re-render tasks
        window.addEventListener('storage', () => {
            setTimeout(renderTasks, 100);
        });

        console.log('Focus Hub initialization complete');

    } catch (error) {
        console.error('Error during initialization:', error);
    }
});