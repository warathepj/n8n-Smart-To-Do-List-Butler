document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const webhookResponsePopup = document.getElementById('webhookResponsePopup');
    const popupMessage = document.getElementById('popupMessage');
    const closePopupBtn = document.querySelector('.popup .close-btn');
    const loadingSpinner = document.getElementById('loadingSpinner');

    function showLoadingSpinner() {
        loadingSpinner.style.display = 'flex';
    }

    function hideLoadingSpinner() {
        loadingSpinner.style.display = 'none';
    }

    async function fetchTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    }

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

    async function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText !== '') {
            const newTask = {
                id: Date.now().toString(),
                text: taskText,
                completed: false
            };
            try {
                const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTask),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                taskInput.value = '';
                renderTasks();
            } catch (error) {
                console.error('Error adding task:', error);
            }
        }
    }

    async function toggleComplete(taskId) {
        try {
            const tasks = await fetchTasks();
            const taskToUpdate = tasks.find(task => task.id === taskId);
            if (taskToUpdate) {
                const updatedTask = { ...taskToUpdate, completed: !taskToUpdate.completed };
                const response = await fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedTask),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                renderTasks();
            }
        } catch (error) {
            console.error('Error toggling task completion:', error);
        }
    }

    async function deleteTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            renderTasks();
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
            const tasks = await fetchTasks();
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                showLoadingSpinner();

                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '/api/ai-task';

                const hiddenField = document.createElement('input');
                hiddenField.type = 'hidden';
                hiddenField.name = 'task';
                hiddenField.value = JSON.stringify(task);

                form.appendChild(hiddenField);
                document.body.appendChild(form);
                form.submit();
            }
        }
    });

    renderTasks();

    const eventSource = new EventSource('/events');

    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('Received SSE message:', data);
        popupMessage.textContent = JSON.stringify(data, null, 2);
        webhookResponsePopup.style.display = 'flex';
        hideLoadingSpinner();
        renderTasks();
        setTimeout(() => {
            webhookResponsePopup.style.display = 'none';
        }, 5000);
    };

    eventSource.onerror = function(err) {
        console.error('EventSource failed:', err);
        eventSource.close();
        hideLoadingSpinner();
    };

    closePopupBtn.addEventListener('click', () => {
        webhookResponsePopup.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === webhookResponsePopup) {
            webhookResponsePopup.style.display = 'none';
        }
    });
});