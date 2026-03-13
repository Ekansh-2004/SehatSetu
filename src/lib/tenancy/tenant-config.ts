export interface TenantConfig {
	id: string;
	name: string;
	domain: string;
	aws: {
		accessKeyId: string;
		secretAccessKey: string;
		region: string;
		s3Bucket: string;
	};
	database: {
		uri: string;
		name: string;
	};
	features: {
		fileUpload: boolean;
		audioRecording: boolean;
		aiTranscription: boolean;
		paymentProcessing: boolean;
	};
	limits: {
		maxFileSize: number; // in bytes
		maxFilesPerPatient: number;
		maxStoragePerTenant: number; // in bytes
	};
}

// Mock tenant configurations - in production, this would come from a database or external service
const tenantConfigs: Record<string, TenantConfig> = {
	"tenant-1": {
		id: "tenant-1",
		name: "Main Clinic",
		domain: "mainclinic.com",
		aws: {
			accessKeyId: process.env.TENANT_1_AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.TENANT_1_AWS_SECRET_ACCESS_KEY,
			region: "ap-south-1",
			s3Bucket: "test-livconnect-1",
		},
		database: {
			uri: "",
			name: "clinic_tenant_1",
		},
		features: {
			fileUpload: true,
			audioRecording: true,
			aiTranscription: true,
			paymentProcessing: true,
		},
		limits: {
			maxFileSize: 5 * 1024 * 1024, // 5MB
			maxFilesPerPatient: 100,
			maxStoragePerTenant: 100 * 1024 * 1024 * 1024, // 100GB
		},
	},
	"tenant-2": {
		id: "tenant-2",
		name: "Downtown Medical",
		domain: "downtownmedical.com",
		aws: {
			accessKeyId: process.env.TENANT_2_AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.TENANT_2_AWS_SECRET_ACCESS_KEY,
			region: "us-east-1",
			s3Bucket: "downtown-medical-files",
		},
		database: {
			uri: "",
			name: "clinic_tenant_2",
		},
		features: {
			fileUpload: true,
			audioRecording: true,
			aiTranscription: false,
			paymentProcessing: true,
		},
		limits: {
			maxFileSize: 10 * 1024 * 1024, // 10MB
			maxFilesPerPatient: 50,
			maxStoragePerTenant: 50 * 1024 * 1024 * 1024, // 50GB
		},
	},
	"tenant-3": {
		id: "tenant-3",
		name: "Emergency Care",
		domain: "emergencycare.com",
		aws: {
			accessKeyId: process.env.TENANT_3_AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.TENANT_3_AWS_SECRET_ACCESS_KEY,
			region: "us-west-2",
			s3Bucket: "emergency-care-files",
		},
		database: {
			uri: "",
			name: "clinic_tenant_3",
		},
		features: {
			fileUpload: true,
			audioRecording: false,
			aiTranscription: false,
			paymentProcessing: false,
		},
		limits: {
			maxFileSize: 2 * 1024 * 1024, // 2MB
			maxFilesPerPatient: 25,
			maxStoragePerTenant: 25 * 1024 * 1024 * 1024, // 25GB
		},
	},
	default: {
		id: "default",
		name: "Default",
		domain: "default.com",
		aws: {
			accessKeyId: process.env.TENANT_DEFAULT_AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.TENANT_DEFAULT_AWS_SECRET_ACCESS_KEY,
			region: "us-west-2",
			s3Bucket: "emergency-care-files",
		},
		database: {
			uri: "",
			name: "clinic_tenant_default",
		},
		features: {
			fileUpload: true,
			audioRecording: false,
			aiTranscription: false,
			paymentProcessing: false,
		},
		limits: {
			maxFileSize: 2 * 1024 * 1024, // 2MB
			maxFilesPerPatient: 25,
			maxStoragePerTenant: 25 * 1024 * 1024 * 1024, // 25GB
		},
	},
};

export class TenantConfigService {
	/**
	 * Get tenant configuration by ID
	 */
	static getTenantConfig(tenantId: string): TenantConfig | null {
		return tenantConfigs[tenantId] || null;
	}

	/**
	 * Get tenant configuration by domain
	 */
	static getTenantConfigByDomain(domain: string): TenantConfig | null {
		return Object.values(tenantConfigs).find((config) => config.domain === domain) || null;
	}

	/**
	 * Get tenant configuration by S3 bucket
	 */
	static getTenantConfigByBucket(bucketName: string): TenantConfig | null {
		return Object.values(tenantConfigs).find((config) => config.aws.s3Bucket === bucketName) || null;
	}

	/**
	 * Get all available tenant IDs
	 */
	static getAllTenantIds(): string[] {
		return Object.keys(tenantConfigs);
	}

	/**
	 * Check if a tenant has a specific feature enabled
	 */
	static hasFeature(tenantId: string, feature: keyof TenantConfig["features"]): boolean {
		const config = this.getTenantConfig(tenantId);
		return config?.features[feature] || false;
	}

	/**
	 * Get tenant limits
	 */
	static getTenantLimits(tenantId: string): TenantConfig["limits"] | null {
		const config = this.getTenantConfig(tenantId);
		return config?.limits || null;
	}

	/**
	 * Validate file upload for tenant
	 */
	static validateFileUpload(tenantId: string, fileSize: number): { valid: boolean; error?: string } {
		const config = this.getTenantConfig(tenantId);
		if (!config) {
			return { valid: false, error: "Tenant not found" };
		}

		if (!config.features.fileUpload) {
			return { valid: false, error: "File upload not enabled for this tenant" };
		}

		if (fileSize > config.limits.maxFileSize) {
			return {
				valid: false,
				error: `File size exceeds limit of ${config.limits.maxFileSize / (1024 * 1024)}MB`,
			};
		}

		return { valid: true };
	}
}
