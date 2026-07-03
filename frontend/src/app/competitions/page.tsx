'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../lib/api';

export default function Competitions() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [championships, setChampionships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [selectedChampId, setSelectedChampId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('cravei_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    Promise.all([
      fetch(`${API_BASE_URL}/api/competitions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch(`${API_BASE_URL}/api/competitions/championships`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json())
    ])
    .then(([compsData, champsData]) => {
      if (Array.isArray(compsData)) setCompetitions(compsData);
      if (Array.isArray(champsData)) {
        setChampionships(champsData);
        if (champsData.length > 0) setSelectedChampId(champsData[0].id);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('cravei_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/competitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCompName, championshipId: selectedChampId }),
      });
      const newComp = await res.json();

      if (res.ok) {
        setCompetitions([...competitions, newComp]);
        setShowCreate(false);
        setNewCompName('');
      } else {
        alert(newComp.error || 'Erro ao criar');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="container page display" style={{ fontSize: '2rem' }}>CARREGANDO...</div>;
  }

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem', flexWrap: 'wrap', gap: '2rem' }}>
        <h1 className="text-huge">
          SUAS<br />
          <span className="accent-text">COMPETIÇÕES.</span>
        </h1>
        <button className={showCreate ? 'btn btn-outline' : 'btn'} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'CANCELAR' : 'NOVA COMPETIÇÃO'}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ padding: '2rem', marginBottom: '4rem' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ fontSize: '2rem' }}>CRIAR UMA ARENA</h2>

            <div className="field">
              <label>Nome da Competição</label>
              <input
                type="text"
                className="input"
                value={newCompName}
                onChange={(e) => setNewCompName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Campeonato</label>
              <select
                className="input"
                value={selectedChampId}
                onChange={(e) => setSelectedChampId(e.target.value)}
              >
                {championships.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>CRIAR</button>
          </form>
        </div>
      )}

      <div className="swiss-grid">
        {competitions.length === 0 ? (
          <div className="display muted col-12" style={{ fontSize: '2rem' }}>
            NENHUMA COMPETIÇÃO AINDA. CRIE UMA PARA COMEÇAR A PALPITAR!
          </div>
        ) : (
          competitions.map((comp) => (
            <div key={comp.id} className="card col-4">
              <h3 style={{ fontSize: '1.75rem' }}>{comp.name}</h3>
              <p className="accent-text" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {comp.championship?.name || 'Campeonato'}
              </p>
              <p className="muted" style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {comp.members ? comp.members.length : 1} PARTICIPANTE(S)
              </p>
              <a href={`/competitions/${comp.id}`} style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>
                <button className="btn btn-outline">
                  VER PARTIDAS
                </button>
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
