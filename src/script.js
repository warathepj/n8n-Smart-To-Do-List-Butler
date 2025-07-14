document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');

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
            tasks.push({ text: taskText, completed: false });
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
            })
            .catch(error => {
                console.error('Error sending task data:', error);
                alert('Failed to send task data to AI.'); // Provide user feedback
            });
        }
    });

    renderTasks();
});
