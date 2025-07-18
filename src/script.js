document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const webhookResponsePopup = document.getElementById('webhookResponsePopup');
    const popupMessage = document.getElementById('popupMessage');
    const closePopupBtn = document.querySelector('.popup .close-btn');

    // Function to fetch tasks from the server
    async function fetchTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    }

    // Function to render tasks
    async function renderTasks() {
        const tasks = await fetchTasks();
        taskList.innerHTML = '';
        tasks.forEach((task) => {
            const listItem = document.createElement('li');
            listItem.className = task.completed ? 'completed' : '';
            listItem.innerHTML = `
                <span>${task.text}</span>
                <pre>${task.id}</pre>
                <div class="task-actions">
                    <button class="ai-btn" data-id="${task.id}">AI</button>
                    <button class="complete-btn" data-id="${task.id}">${task.completed ? 'Undo' : 'Complete'}</button>
                    <button class="delete-btn" data-id="${task.id}">Delete</button>
                </div>
            `;
            taskList.appendChild(listItem);
        });
    }

    // Function to add a task
    async function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText !== '') {
            const newTask = {
                id: Date.now().toString(), // Generate a unique ID
                text: taskText,
                completed: false
            };

            try {
                const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newTask),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                taskInput.value = '';
                renderTasks(); // Re-render tasks after adding
            } catch (error) {
                console.error('Error adding task:', error);
            }
        }
    }

    // Function to toggle task completion
    async function toggleComplete(taskId) {
        try {
            const tasks = await fetchTasks();
            const taskToUpdate = tasks.find(task => task.id === taskId);

            if (taskToUpdate) {
                const updatedTask = { ...taskToUpdate, completed: !taskToUpdate.completed };
                const response = await fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedTask),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                renderTasks(); // Re-render tasks after updating
            }
        } catch (error) {
            console.error('Error toggling task completion:', error);
        }
    }

    // Function to delete a task
    async function deleteTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            renderTasks(); // Re-render tasks after deleting
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    addTaskBtn.addEventListener('click', addTask);

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    taskList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('complete-btn')) {
            const taskId = e.target.dataset.id;
            await toggleComplete(taskId);
        } else if (e.target.classList.contains('delete-btn')) {
            const taskId = e.target.dataset.id;
            await deleteTask(taskId);
        } else if (e.target.classList.contains('ai-btn')) {
            const taskId = e.target.dataset.id;
            const tasks = await fetchTasks(); // Fetch tasks to get the specific task object
            const task = tasks.find(t => t.id === taskId);

            if (task) {
                localStorage.setItem('currentTaskForAI', JSON.stringify(task)); // Store the task data
                window.location.href = `/task.html?id=${task.id}`; // Navigate to new page
            }
        }
    });

    renderTasks();

    // Server-Sent Events (SSE)
    const eventSource = new EventSource('/events');

    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('Received SSE message:', data);
        popupMessage.textContent = JSON.stringify(data, null, 2); // Display formatted JSON
        webhookResponsePopup.style.display = 'flex'; // Show the popup

        // Automatically hide the popup after 5 seconds
        setTimeout(() => {
            webhookResponsePopup.style.display = 'none';
        }, 5000);
    };

    eventSource.onerror = function(err) {
        console.error('EventSource failed:', err);
        eventSource.close();
    };

    // Close popup when close button is clicked
    closePopupBtn.addEventListener('click', () => {
        webhookResponsePopup.style.display = 'none';
    });

    // Close popup when clicking outside of the popup content
    window.addEventListener('click', (event) => {
        if (event.target === webhookResponsePopup) {
            webhookResponsePopup.style.display = 'none';
        }
    });
});
