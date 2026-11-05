---
name: projectsight-integration
description: Guides integrating Trimble ProjectSight API to authenticate, fetch checklist templates, and create checklist records dynamically.
---

# ProjectSight API Integration

This skill documents how to integrate with the ProjectSight REST API to manage checklists, templates, and authenticate using Trimble Identity (TID).

## Authentication (OAuth 2.0 Client Credentials)

To retrieve an access token:
- **POST** Endpoint: `https://id.trimble.com/oauth/token`
- **Headers**:
  - `Content-Type: application/x-www-form-urlencoded`
  - `Authorization: Basic <Base64Encoded(ClientID:ClientSecret)>`
- **Request Body**:
  - `grant_type=client_credentials`

## Core API Endpoints

### 1. Checklist Templates
- **GET** `/{portfolioGuid}/{projectId}/checklists/templates`
- **Description**: Returns list of Checklist Templates configured for the Project.

### 2. Create Checklist
- **POST** `/{portfolioGuid}/{projectId}/checklists`
- **Request Body**:
```json
{
  "templateId": "string",
  "name": "string",
  "description": "string",
  "status": "Open"
}
```
- **Description**: Creates a new checklist record from the selected template.
- # ProjectSight API Reference - Checklist Module

This document provides a comprehensive technical reference for the **Checklist** module in the Trimble ProjectSight API. It is designed to train and contextualize integration systems (like antigravity) to understand all GET and POST endpoints, path structures, query behavior, and schema properties of checklists.

---

## 1. Global Context & Path Parameters

Most endpoints in ProjectSight require a scoped context to point to the correct account, portfolio, or project. The following path variables are standardized across all checklist operations:

*   **`{portfolioGuid}`** *(string, UUID format)*: The unique identifier of the target Portfolio.
*   **`{projectId}`** *(string/integer)*: The unique identifier of the specific Project within the portfolio.
*   **`{checklistId}`** *(string/integer)*: The unique identifier of an individual Checklist record.
*   **`{id}`** *(string/integer)*: Unique identifier of a specific background request (e.g., asynchronous list uploads).

---

## 2. API Endpoints Reference

The ProjectSight API separates operations based on whether child records (individual checklist items/points) are included, and whether requests are synchronous or asynchronous.

### A. GET Endpoints (Data Retrieval)

| Method | Path | Description | Children Included? |
| :--- | :--- | :--- | :--- |
| **GET** | `/{portfolioGuid}/{projectId}/checklists/{checklistId}` | Retrieves a single, specific checklist record by its ID. | **Yes** (Full hierarchy) |
| **GET** | `/{portfolioGuid}/{projectId}/checklists` | Retrieves a collection of all checklists for the project. | **Yes** (Full hierarchy) |
| **GET** | `/{portfolioGuid}/{projectId}/checklists/list` | Retrieves a summarized list of checklists for the project. | **No** (Header/meta-data only) |
| **GET** | `/{portfolioGuid}/{projectId}/checklists/workflowstates` | Retrieves valid workflow states specific to checklist records. | N/A |
| **GET** | `/{portfolioGuid}/checklists/reports` | Retrieves a list of all available report templates for checklists. | N/A |
| **GET** | `/{portfolioGuid}/checklists/udfs` | Retrieves all User-Defined Fields (custom fields) configured for checklists. | N/A |
| **GET** | `/{portfolioGuid}/checklists/query/requestList/{id}` | Retrieves the status/details of an asynchronous file upload request. | N/A |

### B. POST Endpoints (Creation & Querying)

| Method | Path | Description | Payload Scope |
| :--- | :--- | :--- | :--- |
| **POST** | `/{portfolioGuid}/{projectId}/checklists` | Creates or updates an individual checklist record. | Parent checklist metadata + nested list of children (checklist items) |
| **POST** | `/{portfolioGuid}/checklists/query` | Queries checklists based on custom search filters. | **Yes** (Always returns full hierarchy) |
| **POST** | `/{portfolioGuid}/checklists/list` | Queries checklists with advanced filters; allows selective retrieval of child items. | **Optional** (Specify in query payload) |
| **POST** | `/{portfolioGuid}/checklists/query/requestList` | Requests a pre-signed blob storage URL to upload bulk lists of checklist records. | Pre-signed upload configurations |

### C. DELETE Endpoints (Clean-up)

For complete lifecycle management, the following delete actions are supported:

| Method | Path | Description |
| :--- | :--- | :--- |
| **DELETE** | `/{portfolioGuid}/{projectId}/checklists/{checklistId}` | Permanently deletes a single checklist record (and cascadingly, its child items). |
| **DELETE** | `/{portfolioGuid}/checklists/query/requestList/{id}` | Cancels/deletes an active bulk upload request. |

---

## 3. Schema & Data Structure Guidance

### A. Parent-Child Hierarchical Model
ProjectSight utilizes a strict hierarchical parent-child design for Checklist records:
1.  **Parent (Checklist Header):** Contains global record information such as title, description, creation date, author, location, and overall status.
2.  **Children (Checklist Items/Rows):** The checklist tasks, inspection points, or pass/fail rows.

#### Key Schema Behaviors:
*   **No Endpoint for Individual Items:** There is **no separate endpoint** to `POST` or `PUT` an individual checklist row (e.g., no `/checklists/{id}/items`).
*   **Transactional Updates:** To add, modify, or remove checklist items, you must send a `POST` request to the parent path `/{portfolioGuid}/{projectId}/checklists`. The payload should include the complete array of items representing the target final state.
*   **Performance Optimization:** When retrieving data in bulk, prefer `GET .../checklists/list` to fetch the high-level dashboard data without fetching massive nested lists of checklist items. If you need selected children, use `POST .../checklists/list` and define which child properties to load.

### B. Dynamic Schema Extensions

The structural schema is dynamic and must be compiled on-the-fly by querying two dynamic metadata endpoints:

1.  **User-Defined Fields (UDFs):**
    *   Endpoint: `GET /{portfolioGuid}/checklists/udfs`
    *   Use Case: ProjectSight allows administrators to add custom input fields to checklists. Any active UDF returned by this endpoint will extend the JSON schema of both POST payloads and GET responses.
2.  **Workflow States:**
    *   Endpoint: `GET /{portfolioGuid}/{projectId}/checklists/workflowstates` (or globally: `GET /{portfolioGuid}/{projectId}/workflowstates/Checklist`).
    *   Use Case: Determines the allowed transition values for the checklist status field (e.g., "Draft", "Open", "In Review", "Closed").

---

## 4. Integration Constraints (Cross-Module Linking)

*   **No Direct Record-to-Record Linking:** ProjectSight API does not support a general-purpose linking mechanism to natively connect a Checklist record to an Action Item (or other objects like RFIs) via direct API linkage endpoints.
*   **Alternative Interconnection Strategy:**
    *   **User Defined Fields (UDFs):** Create custom fields (UDFs) of type "Text" or "Reference" on checklists to store related Action Item IDs or reference URLs.
    *   **Comments/Descriptions:** Store hyperlinks or IDs of related records inside descriptive properties of the checklist items.

