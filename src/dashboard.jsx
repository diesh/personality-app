import React, { useEffect, useState } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resultsRef = collection(db, "results");
        // Initial fetch: latest to oldest
        const q = query(resultsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        const data = querySnapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            fullName: `${docData.firstName || ''} ${docData.lastName || ''}`.trim(),
            formattedDate: docData.timestamp?.toDate().toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            }) || "N/A",
            rawTime: docData.timestamp?.toDate().getTime() || 0
          };
        });

        setResults(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...results].sort((a, b) => {
      if (key === 'timestamp') {
        return direction === 'asc' ? a.rawTime - b.rawTime : b.rawTime - a.rawTime;
      }
      if (key === 'fullName') {
        return direction === 'asc' 
          ? a.fullName.localeCompare(b.fullName) 
          : b.fullName.localeCompare(a.fullName);
      }
      return 0;
    });
    setResults(sortedData);
  };

  const copyToClipboard = (id) => {
    // Hardcode the professional domain so the link is always correct
    const baseUrl = "https://personality.diesh.ca";
    const link = `${baseUrl}/report/${id}`;
  
    navigator.clipboard.writeText(link).then(() => {
      setCopyStatus(id);
      setTimeout(() => setCopyStatus(""), 2000);
    });
  };

  if (loading) return <div style={styles.loader}>Loading...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Client Personality Index</h1>
      </header>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th} onClick={() => requestSort('timestamp')}>
                Date {sortConfig.key === 'timestamp' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th style={styles.th} onClick={() => requestSort('fullName')}>
                Name & Job Title {sortConfig.key === 'fullName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((report) => (
              <tr key={report.id} style={styles.tr}>
                <td style={styles.td}>{report.formattedDate}</td>
                <td style={styles.td}>
                  <div style={styles.nameText}>{report.fullName}</div>
                  <div style={styles.subtext}>{report.jobTitle}</div>
                </td>
                <td style={styles.td}>
                  <div style={styles.actionGap}>
                    <button onClick={() => copyToClipboard(report.id)} style={styles.copyBtn}>
                      {copyStatus === report.id ? "Copied!" : "Copy Link"}
                    </button>
                    <Link to={`/report/${report.id}`} style={styles.openBtn}>
                      Open Report
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  header: { marginBottom: '30px' },
  title: { fontSize: '26px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' },
  tableWrapper: { background: '#fff', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  theadRow: { background: '#fafafa', borderBottom: '1px solid #eee' },
  th: { padding: '15px 20px', fontSize: '11px', fontWeight: '900', color: '#999', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' },
  tr: { borderBottom: '1px solid #f9f9f9' },
  td: { padding: '18px 20px', fontSize: '14px', verticalAlign: 'middle' },
  nameText: { fontWeight: '700', color: '#000', fontSize: '15px' },
  subtext: { fontSize: '12px', color: '#777', marginTop: '2px' },
  actionGap: { display: 'flex', gap: '10px' },
  copyBtn: { padding: '8px 12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', width: '90px' },
  openBtn: { padding: '8px 12px', background: '#000', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  loader: { textAlign: 'center', marginTop: '100px', fontStyle: 'italic', color: '#999' }
};

export default Dashboard;