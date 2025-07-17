document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const webhookResponsePopup = document.getElementById('webhookResponsePopup');
    const popupMessage = document.getElementById('popupMessage');
    const closePopupBtn = document.querySelector('.popup .close-btn');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const listItem = document.createElement('li');
            listItem.className = task.completed ? 'completed' : '';
            listItem.innerHTML = `
                <span>${task.text}</span>
                <pre>${task.id}</pre>
                <div class="task-actions">
                    <button class="ai-btn" data-index="${index}">AI</button>

                    <button class="complete-btn" data-index="${index}">${task.completed ? 'Undo' : 'Complete'}</button>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                </div>
            `;
            taskList.appendChild(listItem);
        });
    }

    function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText !== '') {
            const taskId = Date.now().toString(); // Generate a unique ID
            tasks.push({ id: taskId, text: taskText, completed: false });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    }

    function toggleComplete(index) {
        tasks[index].completed = !tasks[index].completed;
        saveTasks();
        renderTasks();
    }

    function deleteTask(index) {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    }

    addTaskBtn.addEventListener('click', addTask);

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    taskList.addEventListener('click', (e) => {
        if (e.target.classList.contains('complete-btn')) {
            const index = e.target.dataset.index;
            toggleComplete(index);
        } else if (e.target.classList.contains('delete-btn')) {
            const index = e.target.dataset.index;
            deleteTask(index);
        } else if (e.target.classList.contains('ai-btn')) {
            const index = e.target.dataset.index;
            const task = tasks[index]; // Get the task object

            fetch('/api/ai-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(task),
            })
            .then(response => response.json())
            .then(data => {
                console.log('Server response:', data);
                alert('Task data sent to AI!'); // Provide user feedback
                window.location.href = `/task.html?id=${task.id}`; // Navigate to new page
            })
            .catch(error => {
                console.error('Error sending task data:', error);
                alert('Failed to send task data to AI.'); // Provide user feedback
            });
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
