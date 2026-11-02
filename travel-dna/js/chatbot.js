/* ---------- Travel DNA WebLLM chatbot ---------- */
import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

(function(){
  const openBtn = document.getElementById('travelDnaChatButton');
  const chat = document.getElementById('travelDnaChat');
  const closeBtn = document.getElementById('travelDnaChatClose');
  const form = document.getElementById('travelDnaChatForm');
  const input = document.getElementById('travelDnaChatInput');
  const messages = document.getElementById('travelDnaChatMessages');

  if (!openBtn || !chat || !form || !input || !messages) return;

  // Small instruction-tuned model that WebLLM can run locally in the browser.
  const MODEL = 'SmolLM2-135M-Instruct-q0f16-MLC';
  let engine = null;
  let loading = false;
  let history = [];

  function addMessage(text, who){
    const el = document.createElement('div');
    el.className = 'travel-dna-msg ' + who;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function currentDestination(){
    const search = document.getElementById('sharedLocationInput');
    const mapTitle = document.getElementById('mapCardTitle');
    const value = search && search.value.trim();
    if (value) return value;
    if (mapTitle && mapTitle.textContent.trim() && mapTitle.textContent.trim() !== ' ') return mapTitle.textContent.trim();
    return 'your destination';
  }

  const aliases = {
    jaipur:'Rajasthan', jodhpur:'Rajasthan', udaipur:'Rajasthan', jaisalmer:'Rajasthan',
    munnar:'Kerala', kochi:'Kerala', alleppey:'Kerala', alappuzha:'Kerala', varkala:'Kerala',
    shimla:'Himachal Pradesh', manali:'Himachal Pradesh', dharamshala:'Himachal Pradesh',
    bengaluru:'Karnataka', bangalore:'Karnataka', mysuru:'Karnataka', mysore:'Karnataka', hampi:'Karnataka', gokarna:'Karnataka',
    panaji:'Goa', 'north goa':'Goa', 'south goa':'Goa',
    chennai:'Tamil Nadu', madurai:'Tamil Nadu', ooty:'Tamil Nadu', kodaikanal:'Tamil Nadu',
    mumbai:'Maharashtra', pune:'Maharashtra', lonavala:'Maharashtra', nashik:'Maharashtra',
    rishikesh:'Uttarakhand', mussoorie:'Uttarakhand', nainital:'Uttarakhand', auli:'Uttarakhand',
    kolkata:'West Bengal', darjeeling:'West Bengal', kalimpong:'West Bengal',
    guwahati:'Assam', kaziranga:'Assam', majuli:'Assam',
    ahmedabad:'Gujarat', kutch:'Gujarat', dwarka:'Gujarat', somnath:'Gujarat',
    delhi:'Delhi', 'new delhi':'Delhi', leh:'Ladakh', pangong:'Ladakh', nubra:'Ladakh'
  };

  const states = [
    'Kerala','Rajasthan','Himachal Pradesh','Karnataka','Goa','Tamil Nadu','Maharashtra','Uttarakhand',
    'West Bengal','Assam','Gujarat','Delhi','Ladakh','Punjab','Sikkim','Odisha','Bihar','Jharkhand',
    'Chhattisgarh','Telangana','Andhra Pradesh','Madhya Pradesh','Uttar Pradesh','Haryana','Meghalaya',
    'Tripura','Mizoram','Nagaland','Manipur','Arunachal Pradesh','Jammu and Kashmir'
  ];

  function currentState(){
    const p = currentDestination().toLowerCase();
    for (const key in aliases) if (p === key || p.includes(key)) return aliases[key];
    for (const state of states) if (p.includes(state.toLowerCase())) return state;
    return '';
  }

  function setInputState(disabled){
    input.disabled = disabled;
    const button = document.getElementById('travelDnaChatSend');
    if (button) button.disabled = disabled;
  }

  async function loadWebLLM(){
    if (engine || loading) return;
    loading = true;
    setInputState(true);
    const loadMsg = addMessage('⏳ Loading the local Travel DNA AI… 0%', 'bot');
    try {
      engine = await CreateMLCEngine(MODEL, {
        logLevel: 'ERROR',
        initProgressCallback: (report) => {
          const pct = typeof report.progress === 'number' ? Math.round(report.progress * 100) : null;
          loadMsg.textContent = pct !== null
            ? `⏳ Loading the local Travel DNA AI… ${pct}%`
            : `⏳ ${report.text || 'Loading the local Travel DNA AI…'}`;
          messages.scrollTop = messages.scrollHeight;
        }
      });
      loadMsg.textContent = '✅ Travel DNA AI is ready. Ask me about your destination.';
      history = [{
        role: 'system',
        content: 'You are Travel DNA, a concise India travel assistant inside a travel website. Answer helpfully about destinations, food, outfits, climate, culture, budgets, transport, shopping, souvenirs, packing and itineraries. Prefer the user\'s current destination and state when relevant. Do not claim live weather, prices, bookings, or current availability unless the user provides the data. Keep responses practical and concise.'
      }];
      setInputState(false);
      input.focus();
    } catch (err) {
      console.error(err);
      loadMsg.textContent = '❌ WebLLM could not start. Open the site from localhost and use a browser with WebGPU support. Error: ' + err.message;
    } finally {
      loading = false;
    }
  }

  async function send(text){
    const question = (text || input.value).trim();
    if (!question || loading) return;

    if (!engine) {
      chat.classList.add('open');
      await loadWebLLM();
      if (!engine) return;
    }

    addMessage(question, 'user');
    input.value = '';
    setInputState(true);

    const destination = currentDestination();
    const state = currentState();
    const context = `Current destination: ${destination}. ${state ? 'State/region: ' + state + '.' : ''}`;
    const userMessage = `${context}\nUser question: ${question}`;
    history.push({ role:'user', content:userMessage });

    const botBubble = addMessage('', 'bot');
    try {
      const stream = await engine.chat.completions.create({
        messages: history,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 220,
        stream: true
      });

      let answer = '';
      for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content || '';
        answer += token;
        botBubble.textContent = answer;
        messages.scrollTop = messages.scrollHeight;
      }
      if (!answer.trim()) answer = 'I could not generate a response. Try asking in a different way.';
      botBubble.textContent = answer;
      history.push({ role:'assistant', content:answer });

      // Keep the tiny model's context manageable.
      if (history.length > 9) history = [history[0], ...history.slice(-8)];
    } catch (err) {
      console.error(err);
      botBubble.textContent = 'Generation error: ' + err.message;
      if (history[history.length - 1]?.role === 'user') history.pop();
    } finally {
      setInputState(false);
      input.focus();
    }
  }

  openBtn.addEventListener('click', function(){
    chat.classList.toggle('open');
    if (chat.classList.contains('open')) {
      input.focus();
      loadWebLLM();
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', function(){
    chat.classList.remove('open');
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    send();
  });

  document.querySelectorAll('[data-chat]').forEach(function(btn){
    btn.addEventListener('click', function(){
      chat.classList.add('open');
      send(btn.getAttribute('data-chat'));
    });
  });
})();
