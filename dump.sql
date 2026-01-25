--
-- PostgreSQL database dump
--

\restrict COqY1N1aiq5wkjKrvDEV2mamWIvDUyGw1MsGicECi9lrY0SmeXshwrhRYeJGWdF

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocks (
    id integer NOT NULL,
    name text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.blocks OWNER TO postgres;

--
-- Name: blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blocks_id_seq OWNER TO postgres;

--
-- Name: blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blocks_id_seq OWNED BY public.blocks.id;


--
-- Name: budget_columns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_columns (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    name text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    is_total integer DEFAULT 0 NOT NULL,
    stage_id integer
);


ALTER TABLE public.budget_columns OWNER TO postgres;

--
-- Name: budget_columns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.budget_columns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budget_columns_id_seq OWNER TO postgres;

--
-- Name: budget_columns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.budget_columns_id_seq OWNED BY public.budget_columns.id;


--
-- Name: budget_row_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_row_codes (
    id integer NOT NULL,
    row_id integer NOT NULL,
    code_id integer NOT NULL
);


ALTER TABLE public.budget_row_codes OWNER TO postgres;

--
-- Name: budget_row_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.budget_row_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budget_row_codes_id_seq OWNER TO postgres;

--
-- Name: budget_row_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.budget_row_codes_id_seq OWNED BY public.budget_row_codes.id;


--
-- Name: budget_rows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_rows (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    parent_id integer,
    name text NOT NULL,
    level text NOT NULL,
    chapter_type text,
    row_type text DEFAULT 'manual'::text NOT NULL,
    pdc_item_id integer,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.budget_rows OWNER TO postgres;

--
-- Name: budget_rows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.budget_rows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budget_rows_id_seq OWNER TO postgres;

--
-- Name: budget_rows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.budget_rows_id_seq OWNED BY public.budget_rows.id;


--
-- Name: budget_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_values (
    id integer NOT NULL,
    row_id integer NOT NULL,
    column_id integer NOT NULL,
    manual_value numeric(18,2) DEFAULT '0'::numeric,
    pdc_value numeric(18,2) DEFAULT '0'::numeric
);


ALTER TABLE public.budget_values OWNER TO postgres;

--
-- Name: budget_values_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.budget_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budget_values_id_seq OWNER TO postgres;

--
-- Name: budget_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.budget_values_id_seq OWNED BY public.budget_values.id;


--
-- Name: classifier_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classifier_codes (
    id integer NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    cipher text NOT NULL,
    parent_id integer,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.classifier_codes OWNER TO postgres;

--
-- Name: classifier_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classifier_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classifier_codes_id_seq OWNER TO postgres;

--
-- Name: classifier_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classifier_codes_id_seq OWNED BY public.classifier_codes.id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contracts (
    id integer NOT NULL,
    name text NOT NULL,
    header_text text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.contracts OWNER TO postgres;

--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contracts_id_seq OWNER TO postgres;

--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: executors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.executors (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.executors OWNER TO postgres;

--
-- Name: executors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.executors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.executors_id_seq OWNER TO postgres;

--
-- Name: executors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.executors_id_seq OWNED BY public.executors.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holidays (
    id integer NOT NULL,
    date character varying NOT NULL,
    name text
);


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.holidays_id_seq OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    project_id integer,
    type text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: pdc_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdc_blocks (
    id integer NOT NULL,
    document_id integer NOT NULL,
    name text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.pdc_blocks OWNER TO postgres;

--
-- Name: pdc_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdc_blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdc_blocks_id_seq OWNER TO postgres;

--
-- Name: pdc_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdc_blocks_id_seq OWNED BY public.pdc_blocks.id;


--
-- Name: pdc_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdc_documents (
    id integer NOT NULL,
    name text NOT NULL,
    header_text text,
    vat_rate numeric(5,2) DEFAULT 20,
    created_at timestamp without time zone DEFAULT now(),
    "order" integer DEFAULT 0 NOT NULL,
    project_id integer,
    stage_id integer,
    executor_id integer,
    sections_count integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.pdc_documents OWNER TO postgres;

--
-- Name: pdc_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdc_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdc_documents_id_seq OWNER TO postgres;

--
-- Name: pdc_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdc_documents_id_seq OWNED BY public.pdc_documents.id;


--
-- Name: pdc_elements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdc_elements (
    id integer NOT NULL,
    group_id integer NOT NULL,
    name text NOT NULL,
    note text,
    unit text DEFAULT 'шт.'::text,
    consumption_coef numeric(10,4) DEFAULT 1,
    quantity numeric(18,4) DEFAULT 0,
    material_price numeric(18,2) DEFAULT 0,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.pdc_elements OWNER TO postgres;

--
-- Name: pdc_elements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdc_elements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdc_elements_id_seq OWNER TO postgres;

--
-- Name: pdc_elements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdc_elements_id_seq OWNED BY public.pdc_elements.id;


--
-- Name: pdc_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdc_groups (
    id integer NOT NULL,
    section_id integer NOT NULL,
    name text NOT NULL,
    unit text DEFAULT 'шт.'::text,
    quantity numeric(18,4) DEFAULT 0,
    smr_pnr_price numeric(18,2) DEFAULT 0,
    "order" integer DEFAULT 0 NOT NULL,
    classifier_code_id integer
);


ALTER TABLE public.pdc_groups OWNER TO postgres;

--
-- Name: pdc_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdc_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdc_groups_id_seq OWNER TO postgres;

--
-- Name: pdc_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdc_groups_id_seq OWNED BY public.pdc_groups.id;


--
-- Name: pdc_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdc_sections (
    id integer NOT NULL,
    block_id integer NOT NULL,
    name text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    description text
);


ALTER TABLE public.pdc_sections OWNER TO postgres;

--
-- Name: pdc_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdc_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdc_sections_id_seq OWNER TO postgres;

--
-- Name: pdc_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdc_sections_id_seq OWNED BY public.pdc_sections.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission_type text NOT NULL,
    resource text NOT NULL,
    allowed boolean DEFAULT true NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: price_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_changes (
    id integer NOT NULL,
    group_id integer,
    element_id integer,
    price_type text NOT NULL,
    price numeric(18,2) NOT NULL,
    reason text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.price_changes OWNER TO postgres;

--
-- Name: price_changes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_changes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.price_changes_id_seq OWNER TO postgres;

--
-- Name: price_changes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_changes_id_seq OWNED BY public.price_changes.id;


--
-- Name: progress_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.progress_submissions (
    id integer NOT NULL,
    work_id integer NOT NULL,
    percent integer NOT NULL,
    submitter_id integer NOT NULL,
    approver_id integer,
    status text DEFAULT 'submitted'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    resolved_at timestamp without time zone,
    section_number integer
);


ALTER TABLE public.progress_submissions OWNER TO postgres;

--
-- Name: progress_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.progress_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.progress_submissions_id_seq OWNER TO postgres;

--
-- Name: progress_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.progress_submissions_id_seq OWNED BY public.progress_submissions.id;


--
-- Name: project_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    project_id integer NOT NULL,
    is_owner boolean DEFAULT false NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    owner_expires_at timestamp without time zone,
    works_view boolean DEFAULT true NOT NULL,
    works_edit boolean DEFAULT false NOT NULL,
    works_edit_progress boolean DEFAULT true NOT NULL,
    works_see_amounts boolean DEFAULT false NOT NULL,
    pdc_view boolean DEFAULT false NOT NULL,
    pdc_edit boolean DEFAULT false NOT NULL,
    budget_view boolean DEFAULT false NOT NULL,
    budget_edit boolean DEFAULT false NOT NULL,
    ksp_view boolean DEFAULT true NOT NULL,
    ksp_edit boolean DEFAULT false NOT NULL,
    people_view boolean DEFAULT true NOT NULL,
    people_edit boolean DEFAULT false NOT NULL,
    analytics_view boolean DEFAULT false NOT NULL,
    calendar_view boolean DEFAULT true NOT NULL,
    calendar_edit boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    codes_view boolean DEFAULT false NOT NULL,
    codes_edit boolean DEFAULT false NOT NULL
);


ALTER TABLE public.project_permissions OWNER TO postgres;

--
-- Name: project_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_permissions_id_seq OWNER TO postgres;

--
-- Name: project_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_permissions_id_seq OWNED BY public.project_permissions.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: section_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.section_allocations (
    id integer NOT NULL,
    group_id integer,
    element_id integer,
    section_number integer NOT NULL,
    coefficient numeric(5,2),
    quantity numeric(18,4)
);


ALTER TABLE public.section_allocations OWNER TO postgres;

--
-- Name: section_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.section_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.section_allocations_id_seq OWNER TO postgres;

--
-- Name: section_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.section_allocations_id_seq OWNED BY public.section_allocations.id;


--
-- Name: stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stages (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stages OWNER TO postgres;

--
-- Name: stages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stages_id_seq OWNER TO postgres;

--
-- Name: stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stages_id_seq OWNED BY public.stages.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    created_by_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_groups (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    block_id integer,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.work_groups OWNER TO postgres;

--
-- Name: work_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.work_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_groups_id_seq OWNER TO postgres;

--
-- Name: work_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_groups_id_seq OWNED BY public.work_groups.id;


--
-- Name: work_people; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_people (
    id integer NOT NULL,
    work_id integer NOT NULL,
    date character varying NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    section_number integer
);


ALTER TABLE public.work_people OWNER TO postgres;

--
-- Name: work_people_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.work_people_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_people_id_seq OWNER TO postgres;

--
-- Name: work_people_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_people_id_seq OWNED BY public.work_people.id;


--
-- Name: work_section_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_section_progress (
    id integer NOT NULL,
    work_id integer NOT NULL,
    section_number integer NOT NULL,
    progress_percentage integer DEFAULT 0 NOT NULL,
    volume_actual real DEFAULT 0 NOT NULL,
    cost_actual real DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    plan_start_date character varying,
    actual_start_date character varying,
    plan_end_date character varying,
    actual_end_date character varying,
    planned_people integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.work_section_progress OWNER TO postgres;

--
-- Name: work_section_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.work_section_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_section_progress_id_seq OWNER TO postgres;

--
-- Name: work_section_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_section_progress_id_seq OWNED BY public.work_section_progress.id;


--
-- Name: works; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.works (
    id integer NOT NULL,
    group_id integer,
    name text NOT NULL,
    days_estimated integer DEFAULT 0 NOT NULL,
    volume_amount real DEFAULT 0 NOT NULL,
    volume_unit text DEFAULT 'шт.'::text NOT NULL,
    progress_percentage integer DEFAULT 0 NOT NULL,
    responsible_person text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    "order" integer DEFAULT 0 NOT NULL,
    days_actual integer DEFAULT 0 NOT NULL,
    volume_actual real DEFAULT 0 NOT NULL,
    plan_start_date character varying,
    actual_start_date character varying,
    plan_end_date character varying,
    actual_end_date character varying,
    cost_plan real DEFAULT 0 NOT NULL,
    cost_actual real DEFAULT 0 NOT NULL,
    planned_people integer DEFAULT 0 NOT NULL,
    pdc_group_id integer
);


ALTER TABLE public.works OWNER TO postgres;

--
-- Name: works_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.works_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.works_id_seq OWNER TO postgres;

--
-- Name: works_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.works_id_seq OWNED BY public.works.id;


--
-- Name: blocks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks ALTER COLUMN id SET DEFAULT nextval('public.blocks_id_seq'::regclass);


--
-- Name: budget_columns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_columns ALTER COLUMN id SET DEFAULT nextval('public.budget_columns_id_seq'::regclass);


--
-- Name: budget_row_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_row_codes ALTER COLUMN id SET DEFAULT nextval('public.budget_row_codes_id_seq'::regclass);


--
-- Name: budget_rows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_rows ALTER COLUMN id SET DEFAULT nextval('public.budget_rows_id_seq'::regclass);


--
-- Name: budget_values id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_values ALTER COLUMN id SET DEFAULT nextval('public.budget_values_id_seq'::regclass);


--
-- Name: classifier_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classifier_codes ALTER COLUMN id SET DEFAULT nextval('public.classifier_codes_id_seq'::regclass);


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: executors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.executors ALTER COLUMN id SET DEFAULT nextval('public.executors_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: pdc_blocks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_blocks ALTER COLUMN id SET DEFAULT nextval('public.pdc_blocks_id_seq'::regclass);


--
-- Name: pdc_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_documents ALTER COLUMN id SET DEFAULT nextval('public.pdc_documents_id_seq'::regclass);


--
-- Name: pdc_elements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_elements ALTER COLUMN id SET DEFAULT nextval('public.pdc_elements_id_seq'::regclass);


--
-- Name: pdc_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_groups ALTER COLUMN id SET DEFAULT nextval('public.pdc_groups_id_seq'::regclass);


--
-- Name: pdc_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_sections ALTER COLUMN id SET DEFAULT nextval('public.pdc_sections_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: price_changes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_changes ALTER COLUMN id SET DEFAULT nextval('public.price_changes_id_seq'::regclass);


--
-- Name: progress_submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_submissions ALTER COLUMN id SET DEFAULT nextval('public.progress_submissions_id_seq'::regclass);


--
-- Name: project_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_permissions ALTER COLUMN id SET DEFAULT nextval('public.project_permissions_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: section_allocations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.section_allocations ALTER COLUMN id SET DEFAULT nextval('public.section_allocations_id_seq'::regclass);


--
-- Name: stages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stages ALTER COLUMN id SET DEFAULT nextval('public.stages_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_groups ALTER COLUMN id SET DEFAULT nextval('public.work_groups_id_seq'::regclass);


--
-- Name: work_people id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_people ALTER COLUMN id SET DEFAULT nextval('public.work_people_id_seq'::regclass);


--
-- Name: work_section_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_section_progress ALTER COLUMN id SET DEFAULT nextval('public.work_section_progress_id_seq'::regclass);


--
-- Name: works id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.works ALTER COLUMN id SET DEFAULT nextval('public.works_id_seq'::regclass);


--
-- Data for Name: blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blocks (id, name, "order", created_at) FROM stdin;
1	ДС1	0	2025-12-25 12:31:43.216372
\.


--
-- Data for Name: budget_columns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budget_columns (id, contract_id, name, "order", is_total, stage_id) FROM stdin;
1	1	ВСЕГО	0	1	\N
3	1	Этап 2, млн.  руб	2	0	\N
2	1	Этап 1, млн.  руб	1	0	1
\.


--
-- Data for Name: budget_row_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budget_row_codes (id, row_id, code_id) FROM stdin;
11	14	11
12	14	12
13	14	5
\.


--
-- Data for Name: budget_rows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budget_rows (id, contract_id, parent_id, name, level, chapter_type, row_type, pdc_item_id, "order") FROM stdin;
2	1	\N	РАСХОДЫ	chapter	expense	manual	\N	1
4	1	2	Выплаты по операционной деятельности	section	expense	manual	\N	0
1	1	\N	ДОХОДЫ	chapter	income	manual	\N	0
9	1	3	Группа 2	group	income	manual	\N	1
11	1	8	Элемент 1	item	income	manual	\N	0
8	1	3	Группа 1	group	income	manual	\N	0
10	1	3	Группа 3	group	income	manual	\N	2
5	1	1	Реализация квартир	item	income	manual	\N	0
6	1	1	Поступления от местного бюджета	group	income	manual	\N	1
3	1	1	Поступления от инвестиционной деятельности	section	income	manual	\N	3
12	1	1	ПОСТУПЛЕНИЯ ОТ СПОНСОРОВ	section	income	manual	\N	4
7	1	1	Благодарность от бюджетников	item	income	manual	\N	2
13	1	4	12123	group	expense	manual	\N	0
14	1	13	213123	item	expense	manual	\N	0
15	1	8	11	item	income	manual	\N	1
\.


--
-- Data for Name: budget_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budget_values (id, row_id, column_id, manual_value, pdc_value) FROM stdin;
1	3	1	0.00	0.00
2	4	1	0.00	0.00
6	6	1	0.00	0.00
7	6	2	0.00	0.00
8	6	3	0.00	0.00
12	8	1	0.00	0.00
13	8	2	0.00	0.00
14	8	3	0.00	0.00
15	9	1	0.00	0.00
16	9	2	0.00	0.00
17	9	3	0.00	0.00
18	10	1	0.00	0.00
19	10	2	0.00	0.00
20	10	3	0.00	0.00
21	11	1	0.00	0.00
22	11	2	0.00	0.00
5	5	3	1.00	0.00
23	11	3	0.00	0.00
3	5	1	0.00	0.00
9	7	1	0.00	0.00
10	7	2	1.57	0.00
11	7	3	4.00	0.00
4	5	2	1111578.33	0.00
24	12	1	0.00	0.00
25	12	2	0.00	0.00
26	12	3	0.00	0.00
27	13	1	0.00	0.00
28	13	2	0.00	0.00
29	13	3	0.00	0.00
30	14	1	0.00	0.00
32	14	3	0.00	0.00
31	14	2	1222333.00	0.00
33	15	1	0.00	0.00
34	15	2	0.00	0.00
35	15	3	0.00	0.00
\.


--
-- Data for Name: classifier_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classifier_codes (id, type, name, cipher, parent_id, order_index, created_at) FROM stdin;
8	article	ИНЖЕНЕРНЫЕ СЕТИ	ИНЖ	\N	2	2026-01-10 21:51:32.607976
1	article	СТРОИТЕЛЬНО-МОНТАЖНЫЕ РАБОТЫ	СМР	\N	1	2026-01-10 21:12:18.051343
3	zone	Фундамент	ФУНД	1	0	2026-01-10 21:38:28.908031
4	element	Фундаментная плита	ПЛИТ	3	0	2026-01-10 21:38:37.602068
5	detail	Опалубка	ОПАЛ	4	0	2026-01-10 21:38:41.587689
7	detail	Каркас плиты	АРМ	4	1	2026-01-10 21:51:30.620915
9	zone	Внутренние сети	ВНУТ	8	0	2026-01-10 21:51:32.611635
10	element	Отопление	ОВ1	9	0	2026-01-10 21:51:32.617692
11	detail	Стояки	СТ	10	0	2026-01-10 21:51:32.621659
12	detail	Лежаки	ЛЖ	10	1	2026-01-10 21:51:32.628328
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contracts (id, name, header_text, created_at) FROM stdin;
1	Город между рек	Приложение № 3                                                                                                           к Дополнительному соглашению № 4 \nот _____________ 2025 г.                                   к Договору об оказании услуг \n№ ПГ-35/Д-23 от 30.12.2022	2025-12-30 21:44:48.856077
\.


--
-- Data for Name: executors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.executors (id, project_id, name, "order", created_at) FROM stdin;
1	1	Иванов И.И.	0	2026-01-11 20:23:04.01618
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (id, date, name) FROM stdin;
2	2025-01-01	\N
3	2025-01-02	\N
4	2025-01-03	\N
5	2025-01-06	\N
6	2025-01-07	\N
7	2025-01-08	\N
8	2025-05-01	\N
9	2025-05-02	\N
10	2025-05-08	\N
11	2025-05-09	\N
12	2025-06-12	\N
13	2025-06-13	\N
14	2025-11-03	\N
15	2025-11-04	\N
17	2026-01-01	\N
18	2026-01-02	\N
19	2026-01-05	\N
20	2026-01-06	\N
21	2026-01-07	\N
22	2026-01-08	\N
23	2026-01-09	\N
24	2026-02-23	\N
25	2026-03-09	\N
26	2026-05-11	\N
27	2026-05-01	\N
28	2026-06-12	\N
29	2026-11-04	\N
30	2026-12-31	\N
31	2025-12-31	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, project_id, type, message, is_read, created_at) FROM stdin;
1	3	1	added_to_project	Вас добавили в проект	f	2026-01-09 17:32:11.220064
2	3	1	permissions_changed	Ваши права в проекте изменены	f	2026-01-09 17:33:06.578222
3	3	1	permissions_changed	Ваши права в проекте изменены	f	2026-01-09 20:18:55.682757
8	5	1	added_to_project	Вас добавили в проект	t	2026-01-12 07:25:04.144493
4	6	1	added_to_project	Вас добавили в проект	t	2026-01-09 20:19:57.223977
5	6	1	permissions_changed	Ваши права в проекте изменены	t	2026-01-09 21:14:10.040774
6	6	1	permissions_changed	Ваши права в проекте изменены	t	2026-01-09 21:19:41.37281
7	6	1	permissions_changed	Ваши права в проекте изменены	t	2026-01-12 07:04:45.201484
\.


--
-- Data for Name: pdc_blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdc_blocks (id, document_id, name, "order") FROM stdin;
1	1	Архитектурные решения, полы	0
2	1	Архитектурные решения, Стены и перегородки	1
3	2	111	0
\.


--
-- Data for Name: pdc_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdc_documents (id, name, header_text, vat_rate, created_at, "order", project_id, stage_id, executor_id, sections_count) FROM stdin;
1	Внутренняя отделка	Приложение № 4\nк Договору строительного подряда \nот "25" сентября 2025 № СЖ-1010/Р-25	20.00	2026-01-04 19:55:23.625015	0	1	1	1	3
2	Отделка фасада	\N	20.00	2026-01-04 19:55:36.721778	1	1	1	1	1
\.


--
-- Data for Name: pdc_elements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdc_elements (id, group_id, name, note, unit, consumption_coef, quantity, material_price, "order") FROM stdin;
2	3	333	\N	шт.	1.0000	0.0000	0.00	0
1	1	Звукоизоляция  ("Penoterm НПЛ ЛЭ" 10 мм или аналог) + 80мм завод на стены(на высоту стяжки)		м²	1.0000	7882.6000	700.00	0
3	1	1		шт.	1.0000	0.0000	0.00	1
\.


--
-- Data for Name: pdc_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdc_groups (id, section_id, name, unit, quantity, smr_pnr_price, "order", classifier_code_id) FROM stdin;
3	3	222	шт.	111.0000	11111110.00	0	\N
4	1	00_Устройство сухой керамзитовой засыпки 1	шт.	500.0000	250.00	1	\N
5	1	00_Устройство сухой керамзитовой засыпки 2	шт.	6000.0000	300.00	2	\N
1	1	Устройство звукоизоляции	м²	200.0000	1200000.00	3	5
2	1	Устройство сухой керамзитовой засыпки, толщ. 30мм.	м²	7234.9000	500.00	0	\N
\.


--
-- Data for Name: pdc_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdc_sections (id, block_id, name, "order", description) FROM stdin;
2	1	Санузлы квартир (керамогранитная плитка)    	1	\N
3	3	1111	0	\N
1	1	Жилые комнаты, кухни, холлы, гардеробы квартир (ламинат) 	0	в том числе, но не ограничиваясь: все необходимые работы, материалы и расходные материалы необходимые при проведении работ (в т.ч. при подготовке поверхностей, устройстве разуклонок и гидроизоляции,  устройстве демпферных лент и прокладке инженерных систем, примыканий, разрезки на технологические карты, установке плинтусов, устройстве затирки, обрамлений и т.д)
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, user_id, permission_type, resource, allowed) FROM stdin;
\.


--
-- Data for Name: price_changes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_changes (id, group_id, element_id, price_type, price, reason, user_id, created_at) FROM stdin;
1	\N	1	materials	500.00	Индексация	1	2026-01-11 22:39:08.301712
2	\N	1	materials	600.00	Индексация	1	2026-01-11 22:39:25.593012
3	\N	1	materials	700.00	Замена материала	1	2026-01-11 22:51:20.754315
4	1	\N	smr	1100000.00	Индексация	1	2026-01-11 22:51:57.131302
5	2	\N	smr	400.00	Индексация	1	2026-01-11 22:52:12.036529
6	2	\N	smr	500.00	Индексация	1	2026-01-11 22:52:18.972478
7	1	\N	smr	1200000.00	Индексация	1	2026-01-11 22:55:41.587646
8	4	\N	smr	250.00	Индексация	1	2026-01-13 20:45:37.016255
9	5	\N	smr	300.00	Индексация	1	2026-01-13 20:45:42.095051
\.


--
-- Data for Name: progress_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.progress_submissions (id, work_id, percent, submitter_id, approver_id, status, created_at, resolved_at, section_number) FROM stdin;
1	1	67	1	1	rejected	2026-01-07 20:22:24.515574	2026-01-07 20:22:30.485	\N
2	1	55	1	1	approved	2026-01-07 20:22:51.982008	2026-01-07 20:22:55.486	\N
3	8	4	1	\N	submitted	2026-01-08 15:44:32.256518	\N	\N
4	8	16	1	\N	submitted	2026-01-08 15:44:41.89678	\N	\N
5	8	90	1	\N	submitted	2026-01-08 15:45:50.545951	\N	\N
6	8	10	1	\N	submitted	2026-01-08 15:47:55.069288	\N	\N
7	8	9	1	\N	submitted	2026-01-08 21:33:25.300627	\N	\N
8	8	40	1	\N	submitted	2026-01-08 21:42:03.650546	\N	\N
9	8	25	1	\N	submitted	2026-01-08 22:02:40.089597	\N	\N
10	8	12	1	\N	submitted	2026-01-08 22:04:16.844594	\N	\N
13	9	20	1	\N	submitted	2026-01-08 22:04:43.180218	\N	\N
14	9	14	1	1	rejected	2026-01-08 22:07:19.560363	2026-01-08 22:07:22.325	\N
15	9	25	1	1	approved	2026-01-08 22:07:28.997023	2026-01-08 22:07:30.297	\N
11	8	15	1	1	approved	2026-01-08 22:04:37.87512	2026-01-08 22:11:12.725	\N
12	7	26	1	1	approved	2026-01-08 22:04:39.892091	2026-01-08 22:11:14.542	\N
16	8	27	1	1	rejected	2026-01-12 07:34:07.92352	2026-01-12 07:34:17.646	\N
17	8	39	1	1	approved	2026-01-12 07:34:28.600296	2026-01-12 07:34:30.572	\N
18	10	30	1	1	approved	2026-01-12 08:08:28.570556	2026-01-12 08:08:32.07	\N
19	11	16	1	1	approved	2026-01-12 08:08:29.462579	2026-01-12 08:08:33.427	\N
20	8	9	1	1	approved	2026-01-13 22:43:38.865402	2026-01-13 22:43:49.904	1
21	8	12	1	1	approved	2026-01-13 22:43:46.480338	2026-01-13 22:43:52.483	2
23	10	20	1	1	approved	2026-01-14 22:07:25.629674	2026-01-14 22:07:41.28	1
25	8	16	1	1	approved	2026-01-15 20:16:43.243432	2026-01-15 20:16:48.357	1
24	10	23	1	1	approved	2026-01-15 09:25:23.428792	2026-01-15 20:27:22.621	1
22	7	5	1	1	rejected	2026-01-14 15:05:31.100661	2026-01-16 08:08:50.85	1
26	7	17	1	1	approved	2026-01-16 08:09:20.321512	2026-01-16 08:09:21.347	1
27	7	22	1	1	approved	2026-01-16 08:09:31.657039	2026-01-16 08:09:33.029	2
28	10	34	1	\N	submitted	2026-01-16 08:11:07.580706	\N	1
29	10	25	1	\N	submitted	2026-01-16 08:11:08.190937	\N	2
30	10	20	1	\N	submitted	2026-01-16 08:11:09.000909	\N	3
\.


--
-- Data for Name: project_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_permissions (id, user_id, project_id, is_owner, is_admin, owner_expires_at, works_view, works_edit, works_edit_progress, works_see_amounts, pdc_view, pdc_edit, budget_view, budget_edit, ksp_view, ksp_edit, people_view, people_edit, analytics_view, calendar_view, calendar_edit, created_at, codes_view, codes_edit) FROM stdin;
1	1	1	t	t	\N	t	t	t	t	t	t	t	t	t	t	t	t	t	t	t	2026-01-09 16:39:25.422113	f	f
3	1	2	t	t	\N	t	t	t	t	t	t	t	t	t	t	t	t	t	t	t	2026-01-09 20:17:24.858825	f	f
2	3	1	f	f	\N	t	f	t	f	f	f	f	f	t	f	t	f	f	t	f	2026-01-09 17:32:11.216074	f	f
4	6	1	f	t	\N	t	f	t	f	f	f	f	f	t	f	t	f	f	t	f	2026-01-09 20:19:57.219176	f	f
5	5	1	f	f	\N	t	f	t	f	f	f	f	f	t	f	t	f	f	t	f	2026-01-12 07:25:04.139285	f	f
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, name, created_at, deleted_at) FROM stdin;
1	Проект 1	2026-01-09 16:39:12.906553	\N
2	Проект1	2026-01-09 20:17:24.791126	2026-01-09 20:17:48.321
\.


--
-- Data for Name: section_allocations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.section_allocations (id, group_id, element_id, section_number, coefficient, quantity) FROM stdin;
3	2	\N	1	40.00	\N
4	2	\N	2	60.00	\N
1	4	\N	1	50.00	0.0000
2	4	\N	2	50.00	0.0000
7	5	\N	1	33.33	1000.0000
8	5	\N	2	33.33	2000.0000
9	5	\N	3	33.33	3000.0000
11	\N	1	1	20.00	0.0000
12	\N	1	2	70.00	0.0000
13	\N	1	3	10.00	0.0000
5	1	\N	1	10.00	0.0000
6	1	\N	2	20.00	0.0000
10	1	\N	3	70.00	0.0000
\.


--
-- Data for Name: stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stages (id, project_id, name, "order", created_at) FROM stdin;
1	1	ЭТАП 1	0	2026-01-11 10:08:39.88254
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, is_admin, created_by_id, created_at) FROM stdin;
1	GaisinMF	$2b$10$SgkX0rVn2lHfW21fSuPF3OvRe7iDiCXr9.BYqOis9mZX3Ay6RZH/O	t	\N	2026-01-03 14:37:47.577372
5	vks	$2b$10$m2NRoTbI2iBb18PYMXR/C.Z1KF/U3NBGP1QrRczR.lwjDG1kuEjuK	f	1	2026-01-09 20:16:09.580848
6	VoroncovRA	$2b$10$lHBB6cX6WvWMP//UryYq8uJAxXAfWJ.KcEr2NzQDPmzIP30trE.Ee	f	1	2026-01-09 20:19:44.836323
\.


--
-- Data for Name: work_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_groups (id, name, created_at, block_id, "order") FROM stdin;
1	Подготовительные работы	2025-12-20 21:13:40.888064	1	0
3	Фундамент	2025-12-20 21:13:40.921993	1	0
2	Земляные работы	2025-12-20 21:13:40.906429	1	0
\.


--
-- Data for Name: work_people; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_people (id, work_id, date, count, section_number) FROM stdin;
51	1	2025-12-19	0	\N
1	4	2025-11-24	15	\N
47	3	2026-01-07	1	\N
2	3	2025-11-25	20	\N
58	1	2025-12-29	5	\N
59	1	2025-12-30	1	\N
3	3	2025-11-26	20	\N
4	3	2025-11-27	15	\N
62	1	2025-12-27	1	\N
64	7	2025-12-28	0	\N
65	7	2025-12-29	0	\N
5	2	2025-11-28	10	\N
6	2	2025-11-29	15	\N
7	2	2025-11-30	20	\N
68	8	2025-12-26	1	\N
48	1	2025-12-31	10	\N
8	2	2025-12-01	20	\N
9	2	2025-12-02	20	\N
70	8	2025-12-29	55	\N
71	8	2025-12-30	11	\N
72	8	2025-12-31	11	\N
49	1	2026-01-07	10	\N
10	2	2025-12-03	15	\N
73	8	2026-01-01	2	\N
74	8	2026-01-02	2	\N
75	8	2026-01-03	12	\N
50	1	2026-01-06	10	\N
76	8	2026-01-04	12	\N
77	8	2026-01-05	2	\N
78	8	2026-01-06	2	\N
79	8	2026-01-07	2	\N
12	1	2026-01-02	10	\N
52	1	2025-12-20	10	\N
80	8	2026-01-08	2	\N
53	1	2025-12-21	10	\N
54	1	2025-12-22	10	\N
55	1	2025-12-23	10	\N
11	1	2025-12-24	10	\N
56	1	2025-12-25	10	\N
57	1	2025-12-26	10	\N
60	1	2026-01-01	10	\N
13	1	2026-01-03	10	\N
82	8	2026-01-10	2	\N
14	1	2026-01-04	10	\N
61	1	2026-01-05	10	\N
92	8	2025-12-28	1	\N
69	8	2025-12-27	1	\N
81	8	2026-01-09	3	\N
91	7	2025-12-27	0	\N
63	7	2025-12-26	0	\N
66	7	2025-12-30	0	\N
67	7	2025-12-31	0	\N
85	7	2026-01-01	0	\N
86	7	2026-01-02	0	\N
87	7	2026-01-03	0	\N
83	7	2026-01-04	0	\N
84	7	2026-01-05	10	\N
88	7	2026-01-06	0	\N
89	7	2026-01-07	0	\N
93	7	2026-01-09	10	\N
94	7	2026-01-10	0	\N
90	7	2026-01-08	0	\N
95	10	2025-12-31	1	\N
96	10	2026-01-01	5	\N
\.


--
-- Data for Name: work_section_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_section_progress (id, work_id, section_number, progress_percentage, volume_actual, cost_actual, updated_at, plan_start_date, actual_start_date, plan_end_date, actual_end_date, planned_people) FROM stdin;
2	8	2	12	0	0	2026-01-13 22:43:52.488153	\N	\N	\N	\N	0
1	8	1	16	0	0	2026-01-15 20:16:48.363	\N	\N	\N	\N	10
3	10	1	23	100	10000	2026-01-15 20:27:22.63	2026-01-01	2026-01-03	2026-01-31	2026-02-01	10
4	7	1	17	0	0	2026-01-16 08:09:21.353415	\N	\N	\N	\N	0
5	7	2	22	0	0	2026-01-16 08:09:33.036677	\N	\N	\N	\N	0
\.


--
-- Data for Name: works; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.works (id, group_id, name, days_estimated, volume_amount, volume_unit, progress_percentage, responsible_person, created_at, "order", days_actual, volume_actual, plan_start_date, actual_start_date, plan_end_date, actual_end_date, cost_plan, cost_actual, planned_people, pdc_group_id) FROM stdin;
10	\N	Устройство сухой керамзитовой засыпки 1	0	0	шт.	23		2026-01-12 08:07:05.295511	1	0	0	2025-01-21	2025-01-20	2025-02-14	2025-03-04	0	0	0	4
1	1	Ограждение территории	5	150	п.м	55	Иванов И.И.	2025-12-20 21:13:40.89479	0	4	159	2025-12-19	2025-12-20	2026-01-26	2026-01-31	11000	10000	10	\N
2	1	Устройство бытового городка	3	1	компл	36	Петров П.П.	2025-12-20 21:13:40.900352	1	0	1	2025-12-01	2025-12-23	2026-02-08	2025-12-29	1e+08	1.00111e+08	0	\N
3	2	Разработка грунта экскаватором	10	500	м3	23	Сидоров С.С.	2025-12-20 21:13:40.911637	0	0	0	\N	\N		\N	0	0	0	\N
4	2	Ручная доработка грунта	4	50	м3	42	Сидоров С.С.	2025-12-20 21:13:40.915912	1	0	0	\N	\N	\N	\N	0	0	0	\N
6	2	Подчистка дна котлована	11	111	м3	37	Михайлов А.С.	2025-12-20 21:46:30.305027	2	15	112	\N	\N	\N	\N	0	0	0	\N
5	3	Устройство бетонной подготовки	6	120	м2	0	Козлов К.К.	2025-12-20 21:13:40.926189	0	0	0	\N	\N	\N	\N	0	0	0	\N
11	\N	Устройство сухой керамзитовой засыпки 2	0	0	шт.	16		2026-01-12 08:07:05.305254	2	0	0	\N	\N	\N	\N	0	0	0	5
7	\N	Устройство звукоизоляции	0	7234.9	м²	20	Петров П.П.	2026-01-08 08:32:14.228771	1	0	2.4	2026-01-01	2026-01-09	2026-01-26	2026-01-26	7.2349e+09	0	2	1
8	\N	Устройство сухой керамзитовой засыпки, толщ. 30мм.	0	7234.9	м²	14	Иванов И.И.	2026-01-08 08:32:14.249583	0	0	0	2025-12-10	2025-12-31	2026-07-10	2026-01-25	2.89396e+06	3.47275e+06	10	2
9	\N	222	0	111	шт.	25	Петров П.П.	2026-01-08 08:32:14.260124	0	0	0	\N	\N	\N	\N	1.2333332e+09	0	0	3
\.


--
-- Name: blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.blocks_id_seq', 1, true);


--
-- Name: budget_columns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.budget_columns_id_seq', 5, true);


--
-- Name: budget_row_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.budget_row_codes_id_seq', 13, true);


--
-- Name: budget_rows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.budget_rows_id_seq', 15, true);


--
-- Name: budget_values_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.budget_values_id_seq', 35, true);


--
-- Name: classifier_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classifier_codes_id_seq', 12, true);


--
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contracts_id_seq', 1, true);


--
-- Name: executors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.executors_id_seq', 1, true);


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holidays_id_seq', 31, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 8, true);


--
-- Name: pdc_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdc_blocks_id_seq', 3, true);


--
-- Name: pdc_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdc_documents_id_seq', 2, true);


--
-- Name: pdc_elements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdc_elements_id_seq', 3, true);


--
-- Name: pdc_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdc_groups_id_seq', 5, true);


--
-- Name: pdc_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdc_sections_id_seq', 3, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 22, true);


--
-- Name: price_changes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_changes_id_seq', 9, true);


--
-- Name: progress_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.progress_submissions_id_seq', 30, true);


--
-- Name: project_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_permissions_id_seq', 5, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_id_seq', 2, true);


--
-- Name: section_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.section_allocations_id_seq', 13, true);


--
-- Name: stages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stages_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: work_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.work_groups_id_seq', 4, true);


--
-- Name: work_people_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.work_people_id_seq', 96, true);


--
-- Name: work_section_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.work_section_progress_id_seq', 5, true);


--
-- Name: works_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.works_id_seq', 11, true);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);


--
-- Name: budget_columns budget_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_columns
    ADD CONSTRAINT budget_columns_pkey PRIMARY KEY (id);


--
-- Name: budget_row_codes budget_row_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_row_codes
    ADD CONSTRAINT budget_row_codes_pkey PRIMARY KEY (id);


--
-- Name: budget_rows budget_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_rows
    ADD CONSTRAINT budget_rows_pkey PRIMARY KEY (id);


--
-- Name: budget_values budget_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_values
    ADD CONSTRAINT budget_values_pkey PRIMARY KEY (id);


--
-- Name: classifier_codes classifier_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classifier_codes
    ADD CONSTRAINT classifier_codes_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: executors executors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.executors
    ADD CONSTRAINT executors_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_date_unique UNIQUE (date);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pdc_blocks pdc_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_blocks
    ADD CONSTRAINT pdc_blocks_pkey PRIMARY KEY (id);


--
-- Name: pdc_documents pdc_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_documents
    ADD CONSTRAINT pdc_documents_pkey PRIMARY KEY (id);


--
-- Name: pdc_elements pdc_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_elements
    ADD CONSTRAINT pdc_elements_pkey PRIMARY KEY (id);


--
-- Name: pdc_groups pdc_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_groups
    ADD CONSTRAINT pdc_groups_pkey PRIMARY KEY (id);


--
-- Name: pdc_sections pdc_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_sections
    ADD CONSTRAINT pdc_sections_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: price_changes price_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_changes
    ADD CONSTRAINT price_changes_pkey PRIMARY KEY (id);


--
-- Name: progress_submissions progress_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_submissions
    ADD CONSTRAINT progress_submissions_pkey PRIMARY KEY (id);


--
-- Name: project_permissions project_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_permissions
    ADD CONSTRAINT project_permissions_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: section_allocations section_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.section_allocations
    ADD CONSTRAINT section_allocations_pkey PRIMARY KEY (id);


--
-- Name: stages stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: work_groups work_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_groups
    ADD CONSTRAINT work_groups_pkey PRIMARY KEY (id);


--
-- Name: work_people work_people_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_people
    ADD CONSTRAINT work_people_pkey PRIMARY KEY (id);


--
-- Name: work_section_progress work_section_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_section_progress
    ADD CONSTRAINT work_section_progress_pkey PRIMARY KEY (id);


--
-- Name: works works_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_pkey PRIMARY KEY (id);


--
-- Name: budget_columns budget_columns_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_columns
    ADD CONSTRAINT budget_columns_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: budget_row_codes budget_row_codes_code_id_classifier_codes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_row_codes
    ADD CONSTRAINT budget_row_codes_code_id_classifier_codes_id_fk FOREIGN KEY (code_id) REFERENCES public.classifier_codes(id) ON DELETE CASCADE;


--
-- Name: budget_row_codes budget_row_codes_row_id_budget_rows_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_row_codes
    ADD CONSTRAINT budget_row_codes_row_id_budget_rows_id_fk FOREIGN KEY (row_id) REFERENCES public.budget_rows(id) ON DELETE CASCADE;


--
-- Name: budget_rows budget_rows_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_rows
    ADD CONSTRAINT budget_rows_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: budget_values budget_values_column_id_budget_columns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_values
    ADD CONSTRAINT budget_values_column_id_budget_columns_id_fk FOREIGN KEY (column_id) REFERENCES public.budget_columns(id) ON DELETE CASCADE;


--
-- Name: budget_values budget_values_row_id_budget_rows_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_values
    ADD CONSTRAINT budget_values_row_id_budget_rows_id_fk FOREIGN KEY (row_id) REFERENCES public.budget_rows(id) ON DELETE CASCADE;


--
-- Name: executors executors_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.executors
    ADD CONSTRAINT executors_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: pdc_blocks pdc_blocks_document_id_pdc_documents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_blocks
    ADD CONSTRAINT pdc_blocks_document_id_pdc_documents_id_fk FOREIGN KEY (document_id) REFERENCES public.pdc_documents(id) ON DELETE CASCADE;


--
-- Name: pdc_documents pdc_documents_executor_id_executors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_documents
    ADD CONSTRAINT pdc_documents_executor_id_executors_id_fk FOREIGN KEY (executor_id) REFERENCES public.executors(id) ON DELETE SET NULL;


--
-- Name: pdc_documents pdc_documents_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_documents
    ADD CONSTRAINT pdc_documents_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: pdc_documents pdc_documents_stage_id_stages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_documents
    ADD CONSTRAINT pdc_documents_stage_id_stages_id_fk FOREIGN KEY (stage_id) REFERENCES public.stages(id) ON DELETE SET NULL;


--
-- Name: pdc_elements pdc_elements_group_id_pdc_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_elements
    ADD CONSTRAINT pdc_elements_group_id_pdc_groups_id_fk FOREIGN KEY (group_id) REFERENCES public.pdc_groups(id) ON DELETE CASCADE;


--
-- Name: pdc_groups pdc_groups_classifier_code_id_classifier_codes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_groups
    ADD CONSTRAINT pdc_groups_classifier_code_id_classifier_codes_id_fk FOREIGN KEY (classifier_code_id) REFERENCES public.classifier_codes(id) ON DELETE SET NULL;


--
-- Name: pdc_groups pdc_groups_section_id_pdc_sections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_groups
    ADD CONSTRAINT pdc_groups_section_id_pdc_sections_id_fk FOREIGN KEY (section_id) REFERENCES public.pdc_sections(id) ON DELETE CASCADE;


--
-- Name: pdc_sections pdc_sections_block_id_pdc_blocks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdc_sections
    ADD CONSTRAINT pdc_sections_block_id_pdc_blocks_id_fk FOREIGN KEY (block_id) REFERENCES public.pdc_blocks(id) ON DELETE CASCADE;


--
-- Name: permissions permissions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: price_changes price_changes_element_id_pdc_elements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_changes
    ADD CONSTRAINT price_changes_element_id_pdc_elements_id_fk FOREIGN KEY (element_id) REFERENCES public.pdc_elements(id) ON DELETE CASCADE;


--
-- Name: price_changes price_changes_group_id_pdc_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_changes
    ADD CONSTRAINT price_changes_group_id_pdc_groups_id_fk FOREIGN KEY (group_id) REFERENCES public.pdc_groups(id) ON DELETE CASCADE;


--
-- Name: price_changes price_changes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_changes
    ADD CONSTRAINT price_changes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: progress_submissions progress_submissions_approver_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_submissions
    ADD CONSTRAINT progress_submissions_approver_id_users_id_fk FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: progress_submissions progress_submissions_submitter_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_submissions
    ADD CONSTRAINT progress_submissions_submitter_id_users_id_fk FOREIGN KEY (submitter_id) REFERENCES public.users(id);


--
-- Name: progress_submissions progress_submissions_work_id_works_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_submissions
    ADD CONSTRAINT progress_submissions_work_id_works_id_fk FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;


--
-- Name: section_allocations section_allocations_element_id_pdc_elements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.section_allocations
    ADD CONSTRAINT section_allocations_element_id_pdc_elements_id_fk FOREIGN KEY (element_id) REFERENCES public.pdc_elements(id) ON DELETE CASCADE;


--
-- Name: section_allocations section_allocations_group_id_pdc_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.section_allocations
    ADD CONSTRAINT section_allocations_group_id_pdc_groups_id_fk FOREIGN KEY (group_id) REFERENCES public.pdc_groups(id) ON DELETE CASCADE;


--
-- Name: stages stages_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: work_groups work_groups_block_id_blocks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_groups
    ADD CONSTRAINT work_groups_block_id_blocks_id_fk FOREIGN KEY (block_id) REFERENCES public.blocks(id);


--
-- Name: work_people work_people_work_id_works_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_people
    ADD CONSTRAINT work_people_work_id_works_id_fk FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;


--
-- Name: work_section_progress work_section_progress_work_id_works_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_section_progress
    ADD CONSTRAINT work_section_progress_work_id_works_id_fk FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;


--
-- Name: works works_group_id_work_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_group_id_work_groups_id_fk FOREIGN KEY (group_id) REFERENCES public.work_groups(id);


--
-- PostgreSQL database dump complete
--

\unrestrict COqY1N1aiq5wkjKrvDEV2mamWIvDUyGw1MsGicECi9lrY0SmeXshwrhRYeJGWdF

