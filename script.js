document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const themeSwitch = document.getElementById('theme-switch');
    const settingsThemeSwitch = document.getElementById('settings-theme-switch');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskTitleInput = document.getElementById('task-title');
    const taskDescInput = document.getElementById('task-desc');
    const taskCategorySelect = document.getElementById('task-category');
    const tasksContainer = document.getElementById('tasks-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const clearTasksBtn = document.getElementById('clear-tasks-btn');
    const loadingModal = document.getElementById('loading-modal');
    const navItems = document.querySelectorAll('.sidebar-nav li, .nav-item');
    const sections = document.querySelectorAll('.section');
    const typingText = document.getElementById('typing-text');
    const todayCompleted = document.getElementById('today-completed');
    const weekCompleted = document.getElementById('week-completed');
    const completionRate = document.getElementById('completion-rate');
    let productivityChart = null;

    // Configuration (Update these for production)
    const PROXY_URL = 'https://taskflow-hs40.onrender.com'; // Change to your deployed proxy URL

    // Initialize AOS animations
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // Typing animation for hero text
    const heroText = "Organize your day. Get AI to break it down for you.";
    let i = 0;
    const typingInterval = setInterval(() => {
        typingText.textContent += heroText[i];
        i++;
        if (i === heroText.length) clearInterval(typingInterval);
    }, 50);

    // Initialize theme
    function initTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            themeSwitch.checked = savedTheme === 'dark';
            settingsThemeSwitch.checked = savedTheme === 'dark';
        } else {
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            themeSwitch.checked = prefersDark;
            settingsThemeSwitch.checked = prefersDark;
        }
    }

    // Toggle theme
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeSwitch.checked = newTheme === 'dark';
        settingsThemeSwitch.checked = newTheme === 'dark';
        
        if (productivityChart) {
            updateChartTheme();
        }
    }

    // Update chart theme
    function updateChartTheme() {
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
        
        productivityChart.options.scales.x.grid.color = borderColor;
        productivityChart.options.scales.y.grid.color = borderColor;
        productivityChart.options.scales.x.ticks.color = textColor;
        productivityChart.options.scales.y.ticks.color = textColor;
        productivityChart.update();
    }

    // Initialize tasks from localStorage
    function initTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        renderTasks(tasks);
        updateStats();
    }

    // Add new task
    function addTask() {
        const title = taskTitleInput.value.trim();
        const description = taskDescInput.value.trim();
        const category = taskCategorySelect.value;
        
        if (!title) return;
        
        const newTask = {
            id: Date.now(),
            title,
            description,
            category,
            completed: false,
            subtasks: [],
            createdAt: new Date().toISOString()
        };
        
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.unshift(newTask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        renderTasks(tasks);
        updateStats();
        
        taskTitleInput.value = '';
        taskDescInput.value = '';
        taskTitleInput.focus();
    }

    // Render tasks
    function renderTasks(tasks, filter = 'all') {
        tasksContainer.innerHTML = '';
        
        const filteredTasks = filter === 'all' 
            ? tasks 
            : tasks.filter(task => task.category === filter);
        
        if (filteredTasks.length === 0) {
            tasksContainer.innerHTML = '<p class="no-tasks">No tasks found. Add a new task to get started!</p>';
            return;
        }
        
        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-card ${task.category}`;
            taskElement.dataset.id = task.id;
            
            const checked = task.completed ? 'checked' : '';
            const subtasksHTML = task.subtasks.map(subtask => `
                <div class="subtask">
                    <input type="checkbox" ${subtask.completed ? 'checked' : ''} data-id="${task.id}" data-subtask-id="${subtask.id}">
                    <span class="subtask-label ${subtask.completed ? 'completed' : ''}">${subtask.text}</span>
                </div>
            `).join('');
            
            taskElement.innerHTML = `
                <div class="task-header">
                    <div class="task-title">
                        <input type="checkbox" ${checked} data-id="${task.id}">
                        <span class="${task.completed ? 'completed' : ''}">${task.title}</span>
                    </div>
                    <div class="task-actions">
                        <button class="task-btn subtasks" data-id="${task.id}" title="Generate subtasks">
                            <i class="fas fa-robot"></i>
                        </button>
                        <button class="task-btn delete" data-id="${task.id}" title="Delete task">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${task.description ? `<p class="task-desc">${task.description}</p>` : ''}
                <span class="task-category">${task.category}</span>
                ${task.subtasks.length > 0 ? `
                    <div class="subtasks-container">
                        ${subtasksHTML}
                    </div>
                ` : ''}
            `;
            
            tasksContainer.appendChild(taskElement);
        });
        
        document.querySelectorAll('.task-btn.delete').forEach(btn => {
            btn.addEventListener('click', deleteTask);
        });
        
        document.querySelectorAll('.task-btn.subtasks').forEach(btn => {
            btn.addEventListener('click', generateSubtasks);
        });
        
        document.querySelectorAll('.task-title input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', toggleTaskComplete);
        });
        
        document.querySelectorAll('.subtask input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', toggleSubtaskComplete);
        });
    }

    // Delete task
    function deleteTask(e) {
        const taskId = parseInt(e.currentTarget.dataset.id);
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        renderTasks(updatedTasks);
        updateStats();
    }

    // Toggle task completion
    function toggleTaskComplete(e) {
        const taskId = parseInt(e.currentTarget.dataset.id);
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = e.target.checked;
            
            if (e.target.checked) {
                tasks[taskIndex].subtasks.forEach(subtask => {
                    subtask.completed = true;
                });
            }
            
            localStorage.setItem('tasks', JSON.stringify(tasks));
            renderTasks(tasks);
            updateStats();
        }
    }

    // Toggle subtask completion
    function toggleSubtaskComplete(e) {
        const taskId = parseInt(e.currentTarget.dataset.id);
        const subtaskId = e.currentTarget.dataset.subtaskId;
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
            const subtaskIndex = tasks[taskIndex].subtasks.findIndex(subtask => subtask.id === subtaskId);
            
            if (subtaskIndex !== -1) {
                tasks[taskIndex].subtasks[subtaskIndex].completed = e.target.checked;
                
                const allSubtasksCompleted = tasks[taskIndex].subtasks.every(subtask => subtask.completed);
                if (allSubtasksCompleted && tasks[taskIndex].subtasks.length > 0) {
                    tasks[taskIndex].completed = true;
                } else {
                    tasks[taskIndex].completed = false;
                }
                
                localStorage.setItem('tasks', JSON.stringify(tasks));
                renderTasks(tasks);
                updateStats();
            }
        }
    }

    // Generate subtasks using AI (Secure Proxy Version)
    async function generateSubtasks(e) {
        const taskId = parseInt(e.currentTarget.dataset.id);
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) return;
        
        const task = tasks[taskIndex];
        loadingModal.style.display = 'flex';
        
        try {
            const response = await fetch(`${PROXY_URL}/api/generate-subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskTitle: task.title,
                    taskDesc: task.description || ''
                })
            });

            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            
            const data = await response.json();
            
            if (data.choices?.[0]?.message?.content) {
                const subtasksText = data.choices[0].message.content;
                const subtasksList = subtasksText.split('\n')
                    .filter(line => line.trim() && !line.toLowerCase().includes('subtasks'))
                    .map(line => line.replace(/^\d+\.\s*/, '').trim())
                    .filter(line => line);
                
                tasks[taskIndex].subtasks = subtasksList.map((text, index) => ({
                    id: `${taskId}-${index}`,
                    text,
                    completed: false
                }));
                
                localStorage.setItem('tasks', JSON.stringify(tasks));
                renderTasks(tasks);
            }
        } catch (error) {
            console.error('AI subtask generation failed:', error);
            alert(`Error: ${error.message || 'Failed to generate subtasks'}`);
        } finally {
            loadingModal.style.display = 'none';
        }
    }

    // Filter tasks by category
    function filterTasks(e) {
        const filter = e.currentTarget.dataset.filter;
        
        filterButtons.forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        renderTasks(tasks, filter);
    }

    // Clear all tasks
    function clearAllTasks() {
        if (confirm('Are you sure you want to delete all tasks? This cannot be undone.')) {
            localStorage.removeItem('tasks');
            tasksContainer.innerHTML = '<p class="no-tasks">No tasks found. Add a new task to get started!</p>';
            updateStats();
        }
    }

    // Update stats
    function updateStats() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const today = new Date().toISOString().split('T')[0];
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Today's stats
        const todayTasks = tasks.filter(task => 
            task.createdAt.split('T')[0] === today && task.completed
        );
        todayCompleted.textContent = todayTasks.length;
        
        // Weekly stats
        const weekTasks = tasks.filter(task => 
            new Date(task.createdAt) >= oneWeekAgo && task.completed
        );
        weekCompleted.textContent = weekTasks.length;
        
        // Completion rate
        const totalWeekTasks = tasks.filter(task => 
            new Date(task.createdAt) >= oneWeekAgo
        ).length;
        const rate = totalWeekTasks > 0 
            ? Math.round((weekTasks.length / totalWeekTasks) * 100)
            : 0;
        completionRate.textContent = `${rate}%`;
        
        updateChart(tasks);
    }

    // Update productivity chart
    function updateChart(tasks) {
        const ctx = document.getElementById('productivity-chart');
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
        
        // Prepare last 7 days data
        const dates = [];
        const completedData = [];
        const totalData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dates.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const dayTasks = tasks.filter(task => 
                task.createdAt.split('T')[0] === dateStr
            );
            totalData.push(dayTasks.length);
            completedData.push(dayTasks.filter(task => task.completed).length);
        }
        
        if (productivityChart) productivityChart.destroy();
        
        productivityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Completed',
                        data: completedData,
                        backgroundColor: primaryColor,
                        borderRadius: 4
                    },
                    {
                        label: 'Total',
                        data: totalData,
                        backgroundColor: borderColor,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: textColor }
                    }
                },
                scales: {
                    x: {
                        grid: { color: borderColor },
                        ticks: { color: textColor }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: borderColor },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    }

    // Switch between sections
    function switchSection(e) {
        const section = e.currentTarget.dataset.section;
        
        navItems.forEach(item => item.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        sections.forEach(sec => sec.classList.remove('active-section'));
        document.querySelector(`.${section}-section`).classList.add('active-section');
    }

    // Event Listeners
    themeSwitch.addEventListener('change', toggleTheme);
    settingsThemeSwitch.addEventListener('change', toggleTheme);
    addTaskBtn.addEventListener('click', addTask);
    taskTitleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    filterButtons.forEach(btn => btn.addEventListener('click', filterTasks));
    clearTasksBtn.addEventListener('click', clearAllTasks);
    navItems.forEach(item => item.addEventListener('click', switchSection));

    // Initialize app
    initTheme();
    initTasks();
});