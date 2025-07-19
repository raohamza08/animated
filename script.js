const API_URL = "https://script.google.com/macros/s/AKfycbyMqqFp_fMTCYaS7opWtiPFTrov0F4vDGKwRdn5ObooE4ufXO2xFLJiwO2buYhPs2zy/exec";

let projectsMap = {};
let timeTypesMap = {};
let manuallyAllowedMap = {};
let projectStatusMap = {};

$(document).ready(function () {
  // Password Toggle Eye
  $('#togglePassword').click(function () {
    const passwordInput = $('#passwordInput');
    const type = passwordInput.attr('type') === 'password' ? 'text' : 'password';
    passwordInput.attr('type', type);
    $(this).toggleClass('fa-eye fa-eye-slash');
  });

  // Password Check on Enter Key
  $('#passwordInput').keypress(function (e) {
    if (e.which === 13) {
      checkPassword();
    }
  });

  // Theme Toggle (if needed in future)
  $('#themeToggle').click(function () {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      $(this).html('<i class="fas fa-moon"></i>');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      $(this).html('<i class="fas fa-sun"></i>');
      localStorage.setItem('theme', 'dark');
    }
  });

  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    $('#themeToggle').html('<i class="fas fa-sun"></i>');
  }

  // Page View Switch
  function showView(viewId) {
    $('#selectionPage, #projectForm, #overtimeForm').addClass('hidden');
    $(`#${viewId}`).removeClass('hidden');
  }

  $('#reportIntakeBtn').click(() => showView('projectForm'));
  $('#overtimeRequestBtn').click(() => showView('overtimeForm'));
  $('#backFromProject, #backFromOvertime').click(() => showView('selectionPage'));
  $('#anotherProjectEntry').click(() => {
    $('#projectThankYou').addClass('hidden');
    $('#projectFormArea').show();
    resetProjectForm();
  });
  $('#anotherOvertimeEntry').click(() => {
    $('#overtimeThankYou').addClass('hidden');
    $('#overtimeFormArea').show();
    resetOvertimeForm();
  });

  // Set Date Range for Tracking Date
const today = new Date();
const oneWeekAgo = new Date();
oneWeekAgo.setDate(today.getDate() - 7);

// Set maxDate to one day ahead of today
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);

const minDate = oneWeekAgo.toISOString().split('T')[0];
const maxDate = tomorrow.toISOString().split('T')[0];

$("#trackingDate").attr("min", minDate).attr("max", maxDate);
$("#overtimeDate").attr("min", minDate).attr("max", maxDate);
$("#dutyDate").attr("min", minDate).attr("max", maxDate);


  function populateDropdowns() {
    console.log('Starting to populate dropdowns...');
    
    $.get(API_URL)
      .done(function (response) {
        console.log('API response received:', response);
        
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        
        // Validate data structure
        if (!data || typeof data !== 'object') {
          console.error('Invalid data structure received from API');
          alert('Invalid data received from server. Please refresh the page.');
          return;
        }
        
        // Store data globally for use in other functions
        window.apiData = data;
        projectsMap = data.projectsMap || {};
        timeTypesMap = data.timeTypesMap || {};
        manuallyAllowedMap = data.manuallyAllowedMap || {};
        projectStatusMap = data.projectStatusMap || {};

        // Debug: Log the data to console
        console.log('Projects Map:', projectsMap);
        console.log('Time Types Map:', timeTypesMap);
        console.log('Manually Allowed Map:', manuallyAllowedMap);
        console.log('Project Status Map:', projectStatusMap);

        // Validate essential data
        if (Object.keys(projectsMap).length === 0) {
          console.warn('No projects found in projectsMap');
        }

        // Project form dropdowns
        $('#profileName').empty().append(new Option("Select Profile", "", true, true));
        if (data.profileNames && Array.isArray(data.profileNames)) {
          data.profileNames.forEach(name => $('#profileName').append(new Option(name, name)));
        } else {
          console.warn('No profile names found in data');
        }

        $('#teamMember').empty().append(new Option("Select Team Member", "", true, true));
        if (data.teamMembers && Array.isArray(data.teamMembers)) {
          data.teamMembers.forEach(name => $('#teamMember').append(new Option(name, name)));
        } else {
          console.warn('No team members found in data');
        }

        // Overtime Profile dropdown - independent
        $('#overtimeProfile').empty().append(new Option("Select Profile", "", true, true));
        if (data.profileNames && Array.isArray(data.profileNames)) {
          data.profileNames.forEach(name => $('#overtimeProfile').append(new Option(name, name)));
        }

        // Employee dropdown - independent, populated immediately
        $('#employee').empty().append(new Option("Select Employee", "", true, true));
        if (data.teamMembers && Array.isArray(data.teamMembers)) {
          data.teamMembers.forEach(name => $('#employee').append(new Option(name, name)));
        }

        // Reason dropdown for overtime
        $('#reason').empty().append(new Option("Select Reason", "", true, true));
        const reasons = ['Project Deadline', 'Emergency Fix', 'Client Request', 'Extra Work', 'Other'];
        reasons.forEach(reason => $('#reason').append(new Option(reason, reason)));

        console.log('Dropdowns populated successfully');
        initializeSelect2();
      })
      .fail(function(xhr, status, error) {
        console.error('Failed to load data from API:', error);
        console.error('Status:', status);
        console.error('Response:', xhr.responseText);
        alert('Failed to load data. Please refresh the page and try again.');
      });
  }

  function initializeSelect2() {
    console.log('Initializing Select2...');
    
    // Destroy existing select2 instances
    $('select').each(function() {
      if ($(this).hasClass('select2-hidden-accessible')) {
        $(this).select2('destroy');
      }
    });
    
    // Initialize select2 for all select elements
    $('select').select2({
      width: '100%',
      theme: 'default',
      dropdownCssClass: 'select2-dropdown-custom',
      placeholder: function() {
        return $(this).find('option:first').text();
      }
    });
    
    console.log('Select2 initialized for all dropdowns');
  }

  function checkProjectStatus(profile, project) {
    const statusMessage = $('#projectStatusMessage');
    statusMessage.remove(); // Remove any existing message

    console.log('Checking project status for:', profile, project);
    console.log('Project Status Map:', projectStatusMap);

    if (projectStatusMap[profile] && projectStatusMap[profile][project]) {
      const status = projectStatusMap[profile][project].toString().toLowerCase().trim();
      console.log('Project status found:', status);
      
      if (status !== 'active') {
        const messageHtml = `
          <div id="projectStatusMessage" class="status-message warning">
            <i class="fas fa-pause-circle"></i>
            <span>This project is currently paused. Please contact management for more information.</span>
          </div>
        `;
        $('#projectName').closest('.form-group').after(messageHtml);
        return false; // Project is paused
      }
    } else {
      console.warn('No status found for project:', profile, project);
    }
    return true; // Project is active or status unknown
  }

  function isProjectActive(profile, project) {
    if (projectStatusMap[profile] && projectStatusMap[profile][project]) {
      const status = projectStatusMap[profile][project].toString().toLowerCase().trim();
      return status === 'active';
    }
    // If no status is found, assume active
    return true;
  }

  function renderTimeTypeOptions(timeTypes, profile, project) {
    const container = $('#timeTypeOptions');
    container.empty(); // Clear old radios
    
    console.log('Rendering time type options for:', profile, project);
    console.log('Time types:', timeTypes);
    console.log('Manually allowed map:', manuallyAllowedMap);
    
    if (!Array.isArray(timeTypes) || timeTypes.length === 0) {
      container.append('<p>No time types found for selected project.</p>');
      return;
    }

    // Add regular time types
    timeTypes.forEach((type, i) => {
      const id = `timeType_${i}`;
      container.append(`
        <label for="${id}" class="radio-label">
          <input type="radio" name="timeType" id="${id}" value="${type}" required>
          ${type}
        </label>
      `);
    });

    // Check if manual time is allowed for this project
    console.log('Checking manual time allowance for profile:', profile, 'project:', project);
    
    let manualAllowed = false;
    
    if (manuallyAllowedMap[profile] && manuallyAllowedMap[profile][project]) {
      const allowedValue = manuallyAllowedMap[profile][project].toString().toLowerCase().trim();
      console.log('Manual allowed value found:', allowedValue);
      manualAllowed = allowedValue === 'yes' || allowedValue === 'true' || allowedValue === '1';
    }

    console.log('Manual time allowed:', manualAllowed);

    if (manualAllowed) {
      const manualId = `timeType_manual`;
      container.append(`
        <label for="${manualId}" class="radio-label">
          <input type="radio" name="timeType" id="${manualId}" value="Manual Time" required>
          Manual Time
        </label>
      `);
      console.log('Manual Time option added');
    } else {
      console.log('Manual Time option not added - not allowed for this project');
    }
  }

  function getSelectedTimeType() {
    return $('input[name="timeType"]:checked').val() || "";
  }

  function generateTimeSlots() {
    const slots = [];
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    for (let i = 0; i < 144; i++) {
      slots.push(formatTime(current));
      current.setMinutes(current.getMinutes() + 10);
    }
   
    slots.push("11:59:59 PM"); // Add 24:00 PM as the last slot
    return slots;
  }

  function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  function calculateTimeDiff(startTime, endTime) {
    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const diffMinutes = endMinutes - startMinutes;
    return `${Math.floor(diffMinutes / 60)}:${(diffMinutes % 60).toString().padStart(2, '0')}`;
  }

  function initProjectForm() {
    populateDropdowns();

    const startSelect = $('#startTime');
    const endSelect = $('#endTime');
    const totalTimeLabel = $('#totalTimeLabel');

    const timeSlots = generateTimeSlots();
    timeSlots.forEach(t => startSelect.append(new Option(t, t)));

    startSelect.on('change', function () {
      const selectedIndex = timeSlots.indexOf($(this).val());
      endSelect.empty().append(new Option("Select End Time", "", true, true));
      for (let i = selectedIndex + 1; i < timeSlots.length; i++) {
        endSelect.append(new Option(timeSlots[i], timeSlots[i]));
      }
      endSelect.select2('destroy').select2({ width: '100%', theme: 'default' });
      totalTimeLabel.text('0:00');
    });

    endSelect.on('change', function () {
      const start = startSelect.val();
      const end = endSelect.val();
      if (!start || !end) return totalTimeLabel.text('0:00');
      const timeDiff = calculateTimeDiff(start, end);
      totalTimeLabel.text(timeDiff);
      $('#totalTime').val(timeDiff);
    });

    $('#profileName').on('change', function () {
      const selectedProfile = $(this).val();
      const projectDropdown = $('#projectName');

      console.log('Selected profile:', selectedProfile);
      console.log('Available projects for profile:', projectsMap[selectedProfile]);

      // Clear existing dropdown options and timeType section
      projectDropdown.empty().append(new Option("Select Client", "", true, true));
      $('#projectStatusMessage').remove();
      $('#timeTypeOptions').empty();

      if (selectedProfile && projectsMap[selectedProfile]) {
        const allProjects = projectsMap[selectedProfile];
        const seen = new Set();

        allProjects.forEach(project => {
          const normalized = project.trim().toLowerCase();
          if (!seen.has(normalized)) {
            seen.add(normalized);
            const isPaused = isProjectPaused(selectedProfile, project);
            const option = new Option(project, project);
            $(option).attr('data-paused', isPaused);
            projectDropdown.append(option);
          }
        });
      }

      // Reinitialize Select2
      projectDropdown.select2('destroy').select2({
        width: '100%',
        theme: 'default',
        dropdownCssClass: 'select2-dropdown-custom',
        templateResult: formatProjectOption,
        templateSelection: formatProjectSelection
      });
    });

    $('#projectName').on('change', function () {
      const selectedProfile = $('#profileName').val();
      const selectedProject = $(this).val();

      if (!selectedProfile || !selectedProject) return;

      if (isProjectPaused(selectedProfile, selectedProject)) {
        showPauseWarning(selectedProject);
        $(this).val('').trigger('change');
        return;
      }

      const timeTypeRaw = timeTypesMap[selectedProfile]?.[selectedProject] || "";
      const timeTypes = timeTypeRaw.split(',').map(t => t.trim()).filter(Boolean);
      renderTimeTypeOptions(timeTypes, selectedProfile, selectedProject);

      const show = selectedProject === 'Other';
      $('#otherProjectGroup').toggleClass('hidden', !show);
      if (show) $('#otherProject').focus();
    });

    $('#submitProjectBtn').click(submitProjectForm);
    $('#resetProjectBtn').click(resetProjectForm);
  }

  // Helper function to check paused status
  function isProjectPaused(profile, project) {
    if (!projectStatusMap[profile] || !projectStatusMap[profile][project]) {
      return false;
    }
    const status = String(projectStatusMap[profile][project]).toLowerCase().trim();
    return status === 'paused' || status === 'inactive';
  }

  // Custom Select2 template for displaying paused projects
  function formatProjectOption(project) {
    if (!project.id) return project.text;
    const $option = $(project.element);
    const isPaused = $option.data('paused');
    const $wrapper = $('<span>').text(project.text);
    if (isPaused) {
      $wrapper.addClass('text-orange-500');
    }
    return $wrapper;
  }

  // Custom Select2 template for selected value
  function formatProjectSelection(project) {
    if (!project.id) return project.text;
    return $(project.element).data('paused') 
      ? $('<span>').text(project.text).addClass('text-orange-500')
      : project.text;
  }

  // Show pause warning modal
  function showPauseWarning(projectName) {
    const $modal = $('#pauseWarningModal');
    $modal.find('.project-name').text(projectName);
    $modal.removeClass('hidden');
    
    // Add click handler for the button
    $('#confirmPauseWarning').off('click').on('click', closePauseWarning);
    
    // Close on ESC key
    $(document).on('keydown.modal', function(e) {
      if (e.key === 'Escape') closePauseWarning();
    });
    
    // Close on backdrop click
    $modal.off('click').on('click', function(e) {
      if (e.target === this) closePauseWarning();
    });
  }

  function closePauseWarning() {
    $('#pauseWarningModal').addClass('hidden');
    $(document).off('keydown.modal');
    $('#confirmPauseWarning').off('click');
    $modal.off('click');
  }

  function submitProjectForm() {
    const formData = {
      profileName: $('#profileName').val(),
      projectName: $('#projectName').val() === 'Other' ? $('#otherProject').val() : $('#projectName').val(),
      timeType: getSelectedTimeType(),
      teamMember: $('#teamMember').val(),
      trackingDate: $('#trackingDate').val(),
      dutyDate: $('#dutyDate').val(),
      startTime: $('#startTime').val(),
      endTime: $('#endTime').val(),
      totalTime: $('#totalTime').val() || $('#totalTimeLabel').text(),
      memo: $('#memo').val()
    };

    // Enhanced Validation with specific error messages
    const errors = [];
    
    if (!formData.profileName) {
      errors.push('Please select a Profile');
    }
    
    if (!formData.projectName) {
      errors.push('Please select a Client/Project');
    }
    
    if ($('#projectName').val() === 'Other' && !$('#otherProject').val().trim()) {
      errors.push('Please specify the Other Project name');
    }
    
    if (!formData.timeType) {
      errors.push('Please select a Time Type');
    }
    
    if (!formData.teamMember) {
      errors.push('Please select a Team Member');
    }
    
   
    
    if (!formData.startTime) {
      errors.push('Please select a Start Time');
    }
    
    if (!formData.endTime) {
      errors.push('Please select an End Time');
    }
     if (!formData.trackingDate) {
      errors.push('Please select a Tracking Date');
    }

     if (!formData.dutyDate) {
      errors.push('Please select your Duty Date');
    }
    
    if (errors.length > 0) {
  displayErrorModal(errors);
  return;
}

    
    console.log('Form validation passed. Submitting:', formData);

    // Show loading state
   showRandomSubmitAnimation();
 // 🔥 Show animated loader


    // Submit to API
    $.ajax({
      url: API_URL,
      type: 'GET',
      data: {
        action: 'submitProject',
        ...formData
      },
      success: function(response) {
        $('#projectFormArea').hide();
        $('#projectThankYou').removeClass('hidden');
    

      },
      error: function() {
        alert('Error submitting form. Please try again.');
      

      }
    });
  }

  function initOvertimeForm() {
    // Initialize time slots for overtime form
    const startSelect = $('#start');
    const endSelect = $('#end');
    const hoursDisplay = $('#hoursDisplay');

    const timeSlots = generateTimeSlots();
    timeSlots.forEach(t => startSelect.append(new Option(t, t)));

    startSelect.on('change', function() {
      const selectedIndex = timeSlots.indexOf($(this).val());
      endSelect.empty().append(new Option("Select End Time", "", true, true));
      for (let i = selectedIndex + 1; i < timeSlots.length; i++) {
        endSelect.append(new Option(timeSlots[i], timeSlots[i]));
      }
      endSelect.select2('destroy').select2({ width: '100%', theme: 'default' });
      hoursDisplay.text('0.00');
    });

    endSelect.on('change', function() {
      const start = startSelect.val();
      const end = endSelect.val();
      if (!start || !end) return hoursDisplay.text('0.00');
      
      const timeDiff = calculateTimeDiff(start, end);
      const [hours, minutes] = timeDiff.split(':').map(Number);
      const decimalHours = hours + (minutes / 60);
      const formattedHours = decimalHours.toFixed(2);
      
      hoursDisplay.text(formattedHours);
      $('#totalTimeOvertime').val(formattedHours);
    });

    // Handle profile change to populate projects
    $('#overtimeProfile').on('change', function() {
      const selectedProfile = $(this).val();
      const projectDropdown = $('#overtimeProject');

      projectDropdown.empty().append(new Option("Select Project", "", true, true));

      if (selectedProfile && projectsMap[selectedProfile]) {
        const allProjects = projectsMap[selectedProfile];
        const seen = new Set();

        allProjects.forEach(project => {
          const normalized = project.trim().toLowerCase();
          if (!seen.has(normalized)) {
            seen.add(normalized);
            projectDropdown.append(new Option(project, project));
          }
        });

        // Add "Other Project" option
        projectDropdown.append(new Option("Other Project", "Other Project"));
      }

      projectDropdown.select2('destroy').select2({
        width: '100%',
        theme: 'default',
        dropdownCssClass: 'select2-dropdown-custom'
      });
    });

    // Handle project change to show/hide manual input
  

    // Attach submit handler
    $('#submitOvertimeBtn').on('click', function(e) {
      e.preventDefault();
      submitOvertimeForm();
    });

    $('#resetOvertimeBtn').click(resetOvertimeForm);
  }

  function submitOvertimeForm() {
    const formData = {
      formType: 'overtime', 
      employee: $('#employee').val(),
      overtimeProfile: $('#overtimeProfile').val(),
      overtimeProject: $('#overtimeProject').val(),
      reason: $('#reason').val(),
      overtimeStart: $('#start').val(),
      overtimeEnd: $('#end').val(),
      overtimeDate: $('#overtimeDate').val(),
      totalTimeOvertime: $('#totalTimeOvertime').val() || $('#hoursDisplay').text(),
      notes: $('#notes').val()
    };

    // Enhanced validation with specific error messages
    const errors = [];
    
    if (!formData.employee) {
      errors.push('Please select an Employee');
    }
    
    if (!formData.overtimeProfile) {
      errors.push('Please select a Profile');
    }
    
    if (!formData.overtimeProject) {
      errors.push('Please select a Project');
    }
    
    
    if (!formData.reason) {
      errors.push('Please select a Reason');
    }
    
    if (!formData.overtimeDate) {
      errors.push('Please select an Overtime Date');
    }
    
    if (!formData.overtimeStart) {
      errors.push('Please select a Start Time');
    }
    
    if (!formData.overtimeEnd) {
      errors.push('Please select an End Time');
    }
    
  
     if (errors.length > 0) {
  displayErrorModal(errors);
  return;
}

    console.log('Submitting overtime form:', formData);
    
    // Show loading state
    const submitBtn = $('#submitOvertimeBtn');
    submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Submitting...').prop('disabled', true);

    $.ajax({
      url: API_URL,
      type: 'GET',
      data: {
        action: 'submitOvertime',
        ...formData
      },
      success: function(response) {
        $('#overtimeFormArea').hide();
        $('#overtimeThankYou').removeClass('hidden');
        submitBtn.html('<i class="fas fa-paper-plane"></i> Submit Request').prop('disabled', false);
      },
      error: function(xhr, status, error) {
        console.error('Error submitting overtime form:', error);
        console.error('Status:', status);
        console.error('Response:', xhr.responseText);
        alert('Error submitting form. Please try again.');
        submitBtn.html('<i class="fas fa-paper-plane"></i> Submit Request').prop('disabled', false);
      }
    });
    
    return false;
  }

  function resetProjectForm() {
    $('#profileName, #projectName, #teamMember, #startTime, #endTime').val('').trigger('change');
    $('#trackingDate, #memo, #otherProject, #dutyDate').val('');
    $('#totalTimeLabel').text('0:00');
    $('#totalTime').val('');
    $('#timeTypeOptions').empty();
    $('#otherProjectGroup').addClass('hidden');
    $('#projectStatusMessage').remove();
    $('input[name="timeType"]').prop('checked', false);
    
    // Reinitialize select2
    initializeSelect2();
  }

  function resetOvertimeForm() {
    $('#employee, #overtimeProfile, #overtimeProject, #reason, #start, #end').val('').trigger('change');
    $('#overtimeDate, #notes, #manualOvertimeProject').val('');
    $('#hoursDisplay').text('0.00');
    $('#totalTimeOvertime').val('');
    $('#manualOvertimeProjectGroup').addClass('hidden');
    
    // Reinitialize select2
    initializeSelect2();
  }

  function debugDropdownState() {
    console.log('=== Dropdown Debug Info ===');
    console.log('Profile selected:', $('#profileName').val());
    console.log('Project dropdown options count:', $('#projectName option').length);
    console.log('Project dropdown HTML:', $('#projectName').html());
    console.log('ProjectsMap keys:', Object.keys(projectsMap));
    console.log('Project Status Map:', projectStatusMap);
    console.log('Is select2 initialized on project dropdown?', $('#projectName').hasClass('select2-hidden-accessible'));
  }

  // Make debug function available globally
  window.debugDropdownState = debugDropdownState;

  // Initialize forms
  initProjectForm();
  initOvertimeForm();

  $('#enterPasswordBtn').on('click', function() {
    checkPassword();
  });
});

// Password functions (from inline script in HTML)
const correctPassword = "EurosHub";
let enterButton = null;

function checkPassword() {
  const input = document.getElementById('passwordInput').value;
  if (input === correctPassword) {
    document.getElementById('passwordOverlay').style.display = "none";

    // 👇 Show animation iframe
    const frame = document.getElementById('logoAnimationFrame');
    frame.style.display = 'block';

    // 👇 Start forced removal after 4 seconds
    setTimeout(() => {
      if (frame) frame.remove(); // force remove iframe
      document.getElementById('selectionPage').style.display = 'block'; // show main
    }, 4000);
    
  } else {
    document.getElementById('passwordError').style.display = "block";
    animateButtonError();
  }
}

document.getElementById('reportIntakeBtn').addEventListener('click', function () {
  document.getElementById('selectionPage').style.display = 'none';  // ✅ Hide main screen
  document.getElementById('projectForm').classList.remove('hidden'); // Show project form
});

document.getElementById('overtimeRequestBtn').addEventListener('click', function () {
  document.getElementById('selectionPage').style.display = 'none';  // ✅ Hide main screen
  document.getElementById('overtimeForm').classList.remove('hidden'); // Show overtime form
});
document.getElementById('backFromProject').addEventListener('click', function () {
  document.getElementById('projectForm').classList.add('hidden');
  document.getElementById('selectionPage').style.display = 'block';  // ✅ Show main screen again
});

document.getElementById('backFromOvertime').addEventListener('click', function () {
  document.getElementById('overtimeForm').classList.add('hidden');
  document.getElementById('selectionPage').style.display = 'block';  // ✅ Show main screen again
});



function animateButtonError() {
  if (!enterButton) {
    enterButton = document.querySelector('#passwordOverlay button');
  }
  
  enterButton.classList.remove('shake');
  void enterButton.offsetWidth;
  enterButton.classList.add('shake');

  enterButton.style.backgroundColor = '#e74c3c';
  setTimeout(() => {
    enterButton.style.backgroundColor = '#00BFA6';
  }, 500);
}

function displayErrorModal(errors) {
  const $modal = $('#errorModal');
  const $list = $('#errorList');
  $list.empty();
  errors.forEach(err => {
    $list.append(`<li>• ${err}</li>`);
  });
  $modal.removeClass('hidden');

  // Close button handler
  $('#closeErrorModal').off('click').on('click', () => {
    $modal.addClass('hidden');
  });
}
//  Clear all cookies (session & persistent) — Same Origin Only
function clearAllCookies() {
  document.cookie.split(";").forEach(function(c) {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
  });
}

//  Clear sessionStorage
function clearSessionData() {
  sessionStorage.clear();
}

//  Execute when page is loaded
window.addEventListener("load", function () {
  clearAllCookies();
  clearSessionData();
});

//  Optional: clear again when tab/window closes
window.addEventListener("beforeunload", function () {
  clearAllCookies();
  clearSessionData();
});
function showRandomSubmitAnimation() {
  const animations = ['anim1', 'anim2', 'anim3', 'anim4', 'anim5', 'anim6'];
  const randomId = animations[Math.floor(Math.random() * animations.length)];
  
  const container = document.getElementById('submitAnimations');
  container.style.display = 'flex';

  // Hide all first
  animations.forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  // Show random one
  const selected = document.getElementById(randomId);
  selected.style.display = 'block';

  // Hide after 2.5 seconds (or adjust)
  setTimeout(() => {
    container.style.display = 'none';
    selected.style.display = 'none';
  }, 4500);
}
