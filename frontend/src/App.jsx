import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GeneralCalculator from './components/GeneralCalculator';
import RecommendationOverview from './components/RecommendationOverview';
import RecommendationCard from './components/RecommendationCard';
import RecommendationDetailsModal from './components/RecommendationDetailsModal';
import ScenarioSimulator from './components/ScenarioSimulator';
import ScenarioComparisonModal from './components/ScenarioComparisonModal';
import ImplementationModal from './components/ImplementationModal';
import OutcomeComparisonModal from './components/OutcomeComparisonModal';
import { api, setSessionContext } from './api';
import { AlertCircle, CheckCircle, RefreshCw, X, Shield, Award, Calculator, Building2 } from 'lucide-react';

export default function App() {
  const [mainTab, setMainTab] = useState('calculator'); // 'calculator' (Component 1) | 'campus' (Component 2)
  const [campuses, setCampuses] = useState([]);
  const [selectedCampusId, setSelectedCampusId] = useState('green-tech-univ-01');
  const [role, setRole] = useState('admin');
  const [health, setHealth] = useState(null);


  const [elements, setElements] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [implementations, setImplementations] = useState([]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals state
  const [selectedDetailsRec, setSelectedDetailsRec] = useState(null);
  const [simulatingRec, setSimulatingRec] = useState(null);
  const [implementingRec, setImplementingRec] = useState(null);
  const [outcomeIntervention, setOutcomeIntervention] = useState(null);
  const [showScenarioComparison, setShowScenarioComparison] = useState(false);
  const [rejectingRec, setRejectingRec] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Update session context on change
  useEffect(() => {
    setSessionContext({
      campusId: selectedCampusId,
      role: role
    });
  }, [selectedCampusId, role]);

  const loadAllData = async () => {
    try {
      setIsLoading(true);

      const [healthData, campusList] = await Promise.all([
        api.getHealth(),
        api.getCampuses()
      ]);
      setHealth(healthData);
      setCampuses(campusList);

      const currentCampus = selectedCampusId || (campusList[0]?.id || 'green-tech-univ-01');

      const [elemList, recList, sumData, scenList, implList] = await Promise.all([
        api.getElements({ campus_id: currentCampus }),
        api.getRecommendations({ campus_id: currentCampus }),
        api.getRecommendationSummary(currentCampus),
        api.getScenarios(currentCampus),
        api.getImplementations(currentCampus)
      ]);

      setElements(elemList);
      setRecommendations(recList);
      setSummary(sumData);
      setScenarios(scenList);
      setImplementations(implList);
    } catch (err) {
      console.error("Error loading application data:", err);
      showNotification("error", `Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedCampusId]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      await api.generateRecommendations({
        campus_id: selectedCampusId,
        force_refresh: true
      });
      showNotification("success", "AI & Rule-based recommendations generated successfully!");
      loadAllData();
    } catch (err) {
      showNotification("error", `Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.approveRecommendation(id);
      showNotification("success", "Recommendation approved.");
      loadAllData();
    } catch (err) {
      showNotification("error", `Approval failed: ${err.message}`);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingRec || !rejectionReason.trim()) return;

    try {
      await api.rejectRecommendation(rejectingRec.id, rejectionReason.trim());
      showNotification("success", "Recommendation rejected with documented reason.");
      setRejectingRec(null);
      setRejectionReason('');
      loadAllData();
    } catch (err) {
      showNotification("error", `Rejection failed: ${err.message}`);
    }
  };

  // Filter recommendations based on active category
  const filteredRecommendations = recommendations.filter((r) => {
    if (activeCategory === 'all') return true;
    return r.element_category === activeCategory || r.category === activeCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Navigation Bar */}
      <Navbar
        campuses={campuses}
        selectedCampus={selectedCampusId}
        onSelectCampus={setSelectedCampusId}
        role={role}
        onRoleChange={setRole}
        health={health}
        onRefresh={loadAllData}
        activeTab={mainTab}
        onTabChange={setMainTab}
      />


      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-semibold border ${
            notification.type === 'error'
              ? 'bg-rose-950/90 border-rose-600 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-600 text-emerald-200'
          }`}>
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center justify-center p-1 bg-slate-900 border border-slate-800 rounded-xl space-x-2">
          <button
            onClick={() => setMainTab('calculator')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              mainTab === 'calculator'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>General Calculator</span>
          </button>
          <button
            onClick={() => setMainTab('campus')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              mainTab === 'campus'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Campus System</span>
          </button>
        </div>

        {/* Component 1 vs Component 2 Conditional Content */}
        {mainTab === 'calculator' ? (
          <GeneralCalculator />
        ) : (
          <div className="space-y-10">
            {/* Recommendation Overview Section */}
            <RecommendationOverview
              summary={summary}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              onGenerateClick={handleGenerateRecommendations}
              isGenerating={isGenerating}
              userRole={role}
            />


        {/* Interactive Scenario Simulator Anchor */}
        <section id="simulator-section">
          <ScenarioSimulator
            elements={elements}
            prefilledRecommendation={simulatingRec}
            onScenarioSaved={loadAllData}
            onOpenComparison={() => setShowScenarioComparison(true)}
          />
        </section>

        {/* Recommendations Cards Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Recommended Interventions ({filteredRecommendations.length})
              </h2>
              <p className="text-xs text-slate-400">
                Prioritized sustainability actions tailored to campus assets and verified by deterministic calculations.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
              <span>Loading campus intelligence...</span>
            </div>
          ) : filteredRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRecommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onViewDetails={setSelectedDetailsRec}
                  onSimulate={(r) => {
                    setSimulatingRec(r);
                    document.getElementById('simulator-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onApprove={handleApprove}
                  onReject={setRejectingRec}
                  onImplement={setImplementingRec}
                  userRole={role}
                />
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <p className="text-slate-400 text-sm">
                No recommendations found for this category filter.
              </p>
              {role !== 'viewer' && (
                <button
                  onClick={handleGenerateRecommendations}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950"
                >
                  Generate Recommendations Now
                </button>
              )}
            </div>
          )}
        </section>

        {/* Implemented Interventions & Outcome Tracker */}
        {implementations.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                <Award className="w-5 h-5 text-teal-400" />
                <span>Implemented Interventions & Outcome Verification</span>
              </h2>
              <p className="text-xs text-slate-400">
                Track live commissioned sustainability projects and compare actual post-implementation measurements against baselines.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {implementations.map((impl) => (
                <div key={impl.id} className="bg-slate-900 border border-teal-900/40 rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{impl.title}</span>
                    <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 uppercase text-[10px]">
                      {impl.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Commissioned: {new Date(impl.implementation_date).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => setOutcomeIntervention(impl)}
                    className="w-full py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-semibold border border-teal-500/30 transition-colors"
                  >
                    Verify & Compare Post-Telemetry
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    )}

  </main>



      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-center text-xs text-slate-500">
        <p>CampusCarbon AI • Deterministic Carbon Engine & UN SDG Intelligence • GreenTech University</p>
      </footer>

      {/* MODALS */}
      {selectedDetailsRec && (
        <RecommendationDetailsModal
          recommendation={selectedDetailsRec}
          onClose={() => setSelectedDetailsRec(null)}
          onSimulate={(r) => {
            setSimulatingRec(r);
            document.getElementById('simulator-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onApprove={handleApprove}
          onReject={setRejectingRec}
          userRole={role}
        />
      )}

      {showScenarioComparison && (
        <ScenarioComparisonModal
          scenarios={scenarios}
          onClose={() => setShowScenarioComparison(false)}
        />
      )}

      {implementingRec && (
        <ImplementationModal
          recommendation={implementingRec}
          onClose={() => setImplementingRec(null)}
          onSuccess={loadAllData}
        />
      )}

      {outcomeIntervention && (
        <OutcomeComparisonModal
          intervention={outcomeIntervention}
          onClose={() => setOutcomeIntervention(null)}
        />
      )}

      {/* Rejection Modal with Mandatory Reason */}
      {rejectingRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Reject Recommendation</h3>
              <button onClick={() => setRejectingRec(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Please document the reason for rejecting <strong className="text-white">"{rejectingRec.title}"</strong>:
            </p>
            <form onSubmit={handleConfirmReject} className="space-y-3">
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                placeholder="e.g. Incompatible with upcoming building renovation; budget reallocated."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectingRec(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectionReason.trim()}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
