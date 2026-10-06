CREATE TABLE sns.sns_post_access_request_m (
id BIGSERIAL PRIMARY KEY,
post_id BIGINT NOT NULL,
requester_user_id BIGINT NOT NULL,
requested_role TEXT NOT NULL DEFAULT 'read',
status_code TEXT NOT NULL DEFAULT 'pending',
request_message TEXT NOT NULL,
decided_by BIGINT,
decided_at TIMESTAMP(3),
decision_message TEXT,
expires_at TIMESTAMP(3),
is_active BOOLEAN NOT NULL DEFAULT true,
memo TEXT,
created_by BIGINT,
created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_by BIGINT,
updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
last_source TEXT,
last_activity TEXT,
transaction_id UUID,
CONSTRAINT sns_post_access_request_m_post_id_fkey FOREIGN KEY (post_id) REFERENCES sns.sns_post_m(post_id) ON DELETE RESTRICT ON UPDATE CASCADE,
CONSTRAINT sns_post_access_request_m_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES common.cm_user_m(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX sns_post_access_request_m_post_id_status_code_idx ON sns.sns_post_access_request_m(post_id, status_code);
CREATE INDEX sns_post_access_request_m_requester_user_id_created_at_idx ON sns.sns_post_access_request_m(requester_user_id, created_at);
CREATE UNIQUE INDEX ux_sns_post_access_request_pending ON sns.sns_post_access_request_m(post_id, requester_user_id) WHERE is_active AND status_code = 'pending';
CREATE UNIQUE INDEX ux_sns_post_access_request_approved ON sns.sns_post_access_request_m(post_id, requester_user_id) WHERE is_active AND status_code = 'approved';
CREATE TABLE sns.sns_post_access_request_h (
id BIGINT NOT NULL,
history_seq BIGINT NOT NULL,
event_type CHAR(1) NOT NULL,
event_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
post_id BIGINT NOT NULL,
requester_user_id BIGINT NOT NULL,
requested_role TEXT NOT NULL DEFAULT 'read',
status_code TEXT NOT NULL DEFAULT 'pending',
request_message TEXT NOT NULL,
decided_by BIGINT,
decided_at TIMESTAMP(3),
decision_message TEXT,
expires_at TIMESTAMP(3),
is_active BOOLEAN NOT NULL DEFAULT true,
memo TEXT,
created_by BIGINT,
created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_by BIGINT,
updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
last_source TEXT,
last_activity TEXT,
transaction_id UUID,
PRIMARY KEY (id, history_seq)
);
