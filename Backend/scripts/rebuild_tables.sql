-- Recreate InnoDB stats tables
CREATE TABLE IF NOT EXISTS mysql.innodb_table_stats (
    database_name VARCHAR(64) NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    last_update TIMESTAMP NOT NULL,
    n_rows BIGINT UNSIGNED NOT NULL,
    clustered_index_size BIGINT UNSIGNED NOT NULL,
    sum_of_other_index_sizes BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (database_name, table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci STATS_PERSISTENT=0;

CREATE TABLE IF NOT EXISTS mysql.innodb_index_stats (
    database_name VARCHAR(64) NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    index_name VARCHAR(64) NOT NULL,
    last_update TIMESTAMP NOT NULL,
    stat_name VARCHAR(64) NOT NULL,
    stat_value BIGINT UNSIGNED NOT NULL,
    sample_size BIGINT UNSIGNED,
    stat_description VARCHAR(1024) NOT NULL,
    PRIMARY KEY (database_name, table_name, index_name, stat_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci STATS_PERSISTENT=0;

-- Analyze all tables to rebuild statistics
ANALYZE TABLE mysql.innodb_table_stats;
ANALYZE TABLE mysql.innodb_index_stats; 