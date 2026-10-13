function Dashboard() {

  const topics = [
    {
      name: "SQL",
      mastery: 82
    },
    {
      name: "Normalization",
      mastery: 56
    },
    {
      name: "Transactions",
      mastery: 74
    },
    {
      name: "Indexing",
      mastery: 42
    }
  ];

  return (
    <div className="dashboard">

      <div className="topbar">
        <div>
          <h1>Welcome back 👋</h1>
          <p>Continue your learning journey.</p>
        </div>

        <div className="profile">
          Student
        </div>
      </div>

      <div className="overall-card">

        <div>
          <p>Overall Mastery</p>
          <h2>68%</h2>
        </div>

        <div className="progress-container">
          <div
            className="progress-bar"
            style={{ width: "68%" }}
          ></div>
        </div>

      </div>

      <h2 className="section-title">
        Topic Mastery
      </h2>

      <div className="topic-grid">

        {topics.map((topic) => (

          <div className="topic-card" key={topic.name}>

            <h3>{topic.name}</h3>

            <div className="topic-progress">
              <div
                style={{
                  width: `${topic.mastery}%`
                }}
              ></div>
            </div>

            <p>{topic.mastery}% mastery</p>

          </div>

        ))}

      </div>

      <div className="weak-topic">

        <h2>⚠️ Needs Attention</h2>

        <h3>Indexing</h3>

        <p>
          Your current mastery is 42%.
          We recommend reviewing indexing concepts
          and taking a short practice quiz.
        </p>

        <button>
          Start Practice
        </button>

      </div>

    </div>
  );
}

export default Dashboard;