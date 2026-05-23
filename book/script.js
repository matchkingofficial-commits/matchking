// Calendar Management
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;
let selectedUserLocalTime = null;
let bookedSlots = []; // Simulated booked slots
let userTimezone = '';

// Kenya (EAT - East Africa Time) is UTC+3
// Available slots: 10 AM - 5 PM Kenya Time
const PROVIDER_TIMEZONE = 'Africa/Nairobi';
const PROVIDER_START_HOUR = 10; // 10 AM
const PROVIDER_END_HOUR = 17; // 5 PM

// Calendly API Configuration
const CALENDLY_API_KEY = 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzY1MzU5NDQ1LCJqdGkiOiJiM2VjMmIxZC1hMTQ3LTQzNzUtYmFhZS0wZTE1NWZkYTAzNDMiLCJ1c2VyX3V1aWQiOiJkZTc1NGI4OC02ZjE3LTQ2MDgtODJkZS1mYzE5M2EyOTk0NWYifQ.KsxFOXryhUcoTcsIAxREcwiqOoV03sRceMUvG-cejMuOeuuyeGEmboOAytX6FnbsWCGqBcyANrzQZrTVRzjoIQ';
const CALENDLY_USERNAME = 'matchking'; // Your Calendly username
const CALENDLY_EVENT_TYPE_ID = 'matchking-demo'; // Will be auto-detected or use your event type slug

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  detectUserTimezone();
  // Skip API verification - it will happen on form submission via backend
  initializeCalendar();
  setupEventListeners();
  generateTimeSlots();
});

function detectUserTimezone() {
  try {
    userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.getElementById('userTimezone').textContent = userTimezone;
  } catch (e) {
    userTimezone = 'UTC';
    document.getElementById('userTimezone').textContent = 'UTC';
  }
}

function setupEventListeners() {
  document.getElementById('prevMonth').addEventListener('click', previousMonth);
  document.getElementById('nextMonth').addEventListener('click', nextMonth);
  
  document.getElementById('continueToForm').addEventListener('click', moveToStep2);
  document.getElementById('backToCalendar').addEventListener('click', moveToStep1);
  document.getElementById('submitForm').addEventListener('click', handleFormSubmit);
  document.getElementById('scheduleAnother').addEventListener('click', resetBooking);
}

function initializeCalendar() {
  renderCalendar();
  updateCurrentMonth();
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);
  
  const firstDayIndex = firstDay.getDay();
  const lastDayDate = lastDay.getDate();
  const prevLastDayDate = prevLastDay.getDate();
  
  const calendarDaysElement = document.getElementById('calendarDays');
  calendarDaysElement.innerHTML = '';
  
  // Previous month days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayElement = createDayElement(prevLastDayDate - i, 'other-month');
    calendarDaysElement.appendChild(dayElement);
  }
  
  // Current month days
  const today = new Date();
  for (let i = 1; i <= lastDayDate; i++) {
    const date = new Date(year, month, i);
    let classes = 'available';
    
    if (date.toDateString() === today.toDateString()) {
      classes += ' today';
    }
    
    // Disable past dates
    if (date < today) {
      classes = 'other-month';
    }
    
    const dayElement = createDayElement(i, classes);
    
    if (classes.includes('available')) {
      dayElement.addEventListener('click', () => selectDate(date, dayElement));
    }
    
    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      dayElement.classList.add('selected');
    }
    
    calendarDaysElement.appendChild(dayElement);
  }
  
  // Next month days
  const remainingDays = 42 - (firstDayIndex + lastDayDate);
  for (let i = 1; i <= remainingDays; i++) {
    const dayElement = createDayElement(i, 'other-month');
    calendarDaysElement.appendChild(dayElement);
  }
}

function createDayElement(day, className) {
  const div = document.createElement('div');
  div.className = `calendar-day ${className}`;
  div.textContent = day;
  return div;
}

function selectDate(date, element) {
  document.querySelectorAll('.calendar-day.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  element.classList.add('selected');
  selectedDate = date;
  selectedTime = null; // Reset time selection when date changes
  
  // Update time slots for selected date
  updateTimeSlots();
  
  // Enable continue button if date is selected
  document.getElementById('continueToForm').disabled = false;
}

function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
  updateCurrentMonth();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
  updateCurrentMonth();
}

function updateCurrentMonth() {
  const options = { month: 'long', year: 'numeric' };
  const monthString = currentDate.toLocaleDateString('en-US', options);
  document.getElementById('currentMonth').textContent = monthString;
}

// Time Slots
function generateTimeSlots() {
  // Pre-populate some booked slots for demonstration
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  bookedSlots = [
    `${tomorrow.toDateString()}_09:00`,
    `${tomorrow.toDateString()}_14:00`,
  ];
  
  updateTimeSlots();
}

function updateTimeSlots() {
  const timeSlotsList = document.getElementById('timeSlotsList');
  timeSlotsList.innerHTML = '';
  
  // Generate time slots: 10 AM to 5 PM Kenya Time in 30-minute intervals
  const kenyaTimeSlots = [];
  for (let hour = PROVIDER_START_HOUR; hour < PROVIDER_END_HOUR; hour++) {
    kenyaTimeSlots.push({ hour, minute: 0 });
    kenyaTimeSlots.push({ hour, minute: 30 });
  }
  
  kenyaTimeSlots.forEach(slot => {
    // Convert Kenya time to user's local time
    const userLocalTime = convertTimeToUserTimezone(slot.hour, slot.minute);
    
    const button = document.createElement('button');
    button.className = 'time-slot';
    button.setAttribute('data-kenya-time', `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`);
    
    // Display ONLY user's local time (Kenya time is hidden)
    button.textContent = userLocalTime.timeStr;
    button.type = 'button';
    
    const slotKey = `${selectedDate?.toDateString() || 'no-date'}_${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`;
    
    if (bookedSlots.includes(slotKey)) {
      button.classList.add('booked');
      button.disabled = true;
    } else {
      // Store both the Kenya time and user local time
      button.addEventListener('click', () => selectTime(button, `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`, userLocalTime));
    }
    
    // Check if this slot is selected (comparing Kenya time)
    if (selectedTime === `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`) {
      button.classList.add('selected');
    }
    
    timeSlotsList.appendChild(button);
  });
}

function formatTime(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  const displayMin = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMin} ${period}`;
}

function convertTimeToUserTimezone(kenyaHour, kenyaMinute) {
  // Create a reference date in Kenya timezone
  const now = new Date();
  const kenyaFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PROVIDER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const userFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Calculate offset between timezones
  const testDate = new Date();
  const kenyaTime = new Date(kenyaFormatter.format(testDate));
  const userTime = new Date(userFormatter.format(testDate));
  const offsetMs = userTime - kenyaTime;
  const offsetHours = offsetMs / (1000 * 60 * 60);
  
  // Apply offset to get user's local time
  let userHour = kenyaHour + offsetHours;
  let userMinute = kenyaMinute;
  
  // Handle day boundaries
  if (userHour >= 24) userHour -= 24;
  if (userHour < 0) userHour += 24;
  
  const timeStr = formatTime(Math.floor(userHour), userMinute);
  return { timeStr, hour: Math.floor(userHour), minute: userMinute };
}

function selectTime(element, kenyaTime, userLocalTime) {
  document.querySelectorAll('.time-slot.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  element.classList.add('selected');
  selectedTime = kenyaTime;
  selectedUserLocalTime = userLocalTime;
}

// Form Navigation
function moveToStep2() {
  if (!selectedDate || !selectedTime) {
    alert('Please select both date and time');
    return;
  }
  
  updateFormStep(2);
}

function moveToStep1() {
  updateFormStep(1);
}

function updateFormStep(step) {
  // Hide all steps
  document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  
  // Show current step
  document.getElementById(`step${step}-content`).classList.add('active');
  document.getElementById(`step${step}`).classList.add('active');
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const experience = document.getElementById('experience').value;
  
  if (!fullName || !email || !phone || !experience) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address');
    return;
  }
  
  // Create Calendly event
  createCalendlyEvent(fullName, email, phone, experience);
}

async function createCalendlyEvent(fullName, email, phone, experience) {
  // Convert selected time and date to ISO 8601 format in Kenya timezone
  const eventStartTime = convertToKenyaISO(selectedDate, selectedTime);
  const eventEndTime = new Date(new Date(eventStartTime).getTime() + 30 * 60000).toISOString();
  
  const bookingData = {
    fullName: fullName,
    email: email,
    phone: phone,
    experience: experience,
    startTime: eventStartTime,
    endTime: eventEndTime,
    calendlyApiKey: CALENDLY_API_KEY,
    clientTimezone: userTimezone,
    clientLocalTime: selectedUserLocalTime.timeStr
  };
  
  try {
    console.log('Sending booking to Vercel API...');
    
    // Send to Vercel serverless function
    const response = await fetch('/api/create-calendly-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API error:', errorData);
      alert(`Error: ${errorData.error || 'Failed to create event'}`);
      return;
    }
    
    const data = await response.json();
    console.log('✓ Event created successfully');
    console.log('Response:', data);
    showConfirmationWithMeetLink(fullName, email, data);
  } catch (error) {
    console.error('Booking error:', error);
    alert('Failed to create booking. Please try again.');
  }
}

function convertToKenyaISO(date, timeStr) {
  // Parse time string (e.g., "10:00 AM")
  const [time, period] = timeStr.includes('AM') || timeStr.includes('PM') 
    ? timeStr.split(' ') 
    : [timeStr, 'AM'];
  const [hour, minute] = time.split(':').map(Number);
  
  // Parse time to 24-hour format
  let hour24 = hour;
  if (period === 'PM' && hour !== 12) hour24 += 12;
  if (period === 'AM' && hour === 12) hour24 = 0;
  
  // Create date object in Kenya timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Kenya is UTC+3, so we need to create the date in UTC and then account for timezone
  const utcDate = new Date(Date.UTC(year, date.getMonth(), date.getDate(), 
                                     hour24 - 3, minute, 0)); // Subtract 3 hours for UTC conversion
  
  return utcDate.toISOString();
}

function showConfirmationWithMeetLink(fullName, email, eventData) {
  showConfirmation(fullName, email);
  
  // Add Calendly event confirmation to booking
  if (eventData && (eventData.calendly_link || eventData.event_uri)) {
    const confirmationMessage = document.querySelector('.confirmation-message');
    const eventLinkElement = document.createElement('div');
    
    let linkHTML = `
      <div style="margin-top: 16px; padding: 16px; background: rgba(255, 106, 0, 0.1); border: 1px solid rgba(255, 106, 0, 0.2); border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">✓ Event Scheduled</p>
    `;
    
    if (eventData.event_uri) {
      linkHTML += `
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #ccc;">Your demo has been added to your calendar. A confirmation email with your Google Meet link will be sent shortly.</p>
      `;
    }
    
    linkHTML += `</div>`;
    eventLinkElement.innerHTML = linkHTML;
    confirmationMessage.parentNode.insertBefore(eventLinkElement, confirmationMessage.nextSibling);
  }
}

function showConfirmation(fullName, email) {
  const dateStr = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Show only user's local time - no mention of Kenya
  const dateTimeString = `${dateStr} at ${selectedUserLocalTime.timeStr}`;
  
  document.getElementById('confirmDateTime').textContent = dateTimeString;
  document.getElementById('confirmName').textContent = fullName;
  document.getElementById('confirmEmail').textContent = email;
  
  // Add to booked slots
  const slotKey = `${selectedDate.toDateString()}_${selectedTime}`;
  bookedSlots.push(slotKey);
  
  updateFormStep(3);
  
  // Log booking (in production, this would send to backend)
  console.log('Booking confirmed:', {
    name: fullName,
    email: email,
    dateTime: dateTimeString
  });
}

function resetBooking() {
  // Reset form
  document.getElementById('demoForm').reset();
  selectedDate = null;
  selectedTime = null;
  
  // Reset calendar to current month
  currentDate = new Date();
  renderCalendar();
  updateCurrentMonth();
  updateTimeSlots();
  
  // Go back to step 1
  updateFormStep(1);
  document.getElementById('continueToForm').disabled = true;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Could close modals or reset forms if needed
  }
});
