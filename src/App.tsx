import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [history, setHistory] = useState<{ type: 'server' | 'user'; prompt: string; timestamp: number }[]>([]);
  const [context, setContext] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [system, setSystem] = useState('You are a helpful assistant.');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ [key: number]: 'up' | 'down' }>({});
  const [editableIndex, setEditableIndex] = useState<number | null>(null);
  const [editableText, setEditableText] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [tags, setTags] = useState<{name: string}[]>([]);

  const handleCancel = () => {
    if (editableIndex !== null) {
      setEditableText(history[editableIndex]?.prompt || '');
      setEditableIndex(null);
    }
  };

  const handleFeedback = (index: number, type: 'up' | 'down') => {
    setFeedback({
      ...feedback,
      [index]: type,
    });

    if (type === 'down') {
      setEditableIndex(index);
      setEditableText(history[index]?.prompt || '');
    }
  };

  const handleSave = () => {
    if (editableIndex !== null) {
      const updatedHistory = [...history];
      updatedHistory[editableIndex].prompt = editableText;
      setHistory(updatedHistory);
      setEditableIndex(null);
    }
  };

  const sendPrompt = async () => {
    setLoading(true);

    let tempHistory = [...history, { prompt: "", type: 'server' as 'server', timestamp: Date.now() }];

    setHistory(tempHistory);
    const tempIndex = tempHistory.length - 1;

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedTag,
        prompt,
        system,
        template: '',
        context,
        options: { temperature: 0.8 }
      })
    };

    const response = await fetch('http://127.0.0.1:11434/api/generate', requestOptions);
    const reader = response.body?.getReader();

    if (reader) {
      let serverResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setLoading(false);
          break;
        }

        const decodedValue = new TextDecoder('utf-8').decode(value);

        try {
          const { response, done, context } = JSON.parse(decodedValue);

          if (response) {
            serverResponse += response;
            tempHistory[tempIndex].prompt = serverResponse;
            setHistory([...tempHistory]);
          }

          if (done) {
            setContext(context);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  };


  useEffect(() => {
    fetch('http://localhost:11434/api/tags')
    .then((response) => response.json())
    .then((data: {models: any[]}) => {
      setTags(data.models);
    });
  }, []);

  useEffect(() => {
    // if latest message is from the user, call sendPrompt
    if (history.length > 0 && history[history.length - 1].type === 'user') {
      sendPrompt();
    }
  }, [history, sendPrompt]);

  return (
    <div className="App">
      <div className="history-container">
        <div className="history">
          {history.map((item, index) => (
            <div key={index} className={`message ${item.type}`}>
              <strong>{`${item.type.toUpperCase()} ${new Date(item.timestamp).toLocaleString()}`}</strong>:
              {editableIndex === index ? null : item.prompt}
              {editableIndex === index ? (
                <textarea
                  className="textarea-editable"
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                />
              ) : null}
              {item.type === 'server' && (
                <div className="feedback-icons">
                   {editableIndex === index && (
                  <>
                    <button className="saveBtn" onClick={handleSave}>Save</button>
                    <button className="cancelBtn" onClick={handleCancel}>Cancel</button>
                  </>
                )}
                  <span><button className={`${feedback[index] === 'up' ? 'selected' :''}`} onClick={() => handleFeedback(index, 'up')}>👍</button>
                    <button className={`${feedback[index] === 'down' ? 'selected' :''}`} onClick={() => handleFeedback(index, 'down')}>👎</button>
                  </span>
                 
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="input-area">
        <textarea
          className="textarea"
          placeholder="Enter your prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        ></textarea>

        <textarea
          className="textarea"
          placeholder="System prompt (optional)"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
        ></textarea>
        <div>

        <select onChange={(v) => setSelectedTag(v.target.value)} >
          {tags.map((tag) => (
            <option key={tag.name} value={tag.name}>
              {tag.name}
            </option>
          ))}
        </select>
                <button
          className={`send-button ${loading ? 'disabled' : ''}`}
          disabled={loading}
          onClick={async () => {
            setHistory(prevHistory => [...prevHistory, { prompt, type: 'user', timestamp: Date.now() }])
          }}
        >
          Send
        </button>
        </div>
      </div>
    </div>
  );
}

export default App;
