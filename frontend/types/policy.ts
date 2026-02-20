export interface ForensicDigest {
    policy_hash: string;
    workflow_hash: string;
    model_version: string;
    prompt_hash: string;
    combined_digest: string;
}

export interface SystemSpec {
    agent_name: string;
    summary: string;
    primary_purpose: string;
    decision_authority: string;
    automation_level: string;
    deployment_stage: string;
    geographic_exposure: string[];
}

export interface DataMap {
    data_categories_detected: string[];
    data_flow_source: string;
    data_storage_retention: string;
    cross_border_transfer: string;
}

export interface PolicyAlignment {
    policy_area: string;
    status: "Compliant" | "Partial Compliance" | "At Risk" | "Non-Compliant" | "Cannot Be Assessed" | "Not Applicable";
    reason: string;
}

export interface RiskScore {
    overall_score: number;
    overall_rating: "High" | "Medium" | "Low" | "Critical";
    breakdown: Record<string, string>;
    confidence_score: string;
}

export interface EvidenceTrace {
    source_doc: string;
    policy_section: string;
    workflow_component: string;
    issue_description: string;
    severity: string;
    snippet: string;
}

export interface RiskSimulation {
    scenario_title: string;
    failure_mode: string;
    description: string;
    plausibility_grounding: string;
    severity: string;
    violated_clause: string;
    confidence_level: string;
}

export interface Recommendation {
    title: string;
    type: "Blocking" | "Advisory" | "Informational";
    description: string;
    related_policy: string;
}

export interface DeploymentVerdict {
    approved: boolean;
    status_label: string;
    approval_conditions: string[];
    catastrophic_consequence?: string;
}

export interface BusinessImpact {
    financial_exposure: string;
    regulatory_penalty: string;
    brand_reputation: string;
    estimated_cost: string;
}

export interface ComplianceReport {
    report_id: string;
    timestamp: string;
    forensic_digest: ForensicDigest;
    workflow_name: string | null;
    system_spec: SystemSpec;
    data_map: DataMap;
    policy_matrix: PolicyAlignment[];
    risk_assessment: RiskScore;
    business_impact?: BusinessImpact;
    evidence: EvidenceTrace[];
    risk_simulations: RiskSimulation[];
    recommendations: Recommendation[];
    verdict: DeploymentVerdict;
}
