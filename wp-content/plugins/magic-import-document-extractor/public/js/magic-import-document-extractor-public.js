/**
 * Magic Import Pro Widget JavaScript - Cloud Processing Version
 * 
 * FEATURES:
 * - All WordPress form compatibility (WPForms, Ninja, Contact Form 7, etc.)
 * - Modal styling and UI
 * - Green background field highlighting
 * - Form field detection logic
 * - Cloud-based AI processing (no user AI configuration needed)
 * - Support for all file types: PDF, DOCX, Images, TXT, CSV, JSON, XML, HTML, MD, RTF
 * - Unlimited forms and pages
 * 
 * ALL EXTRACTION HANDLED BY CLOUD AI WITH LICENSE KEY
 */

(function ($) {
    'use strict';

    // DEBUG MODE: Set to true to show detected fields in modal (for development/testing)
    const DEBUG_MODE = false;

    window.magicImportFreeWidget = function () {
        this.detectedFields = [];
        this.isProcessing = false;
        this.currentFormId = null;
        this.debugMode = DEBUG_MODE; // Instance debug flag
        this.pendingFile = null; // For credit modal
        this.pendingCredits = 1; // For credit modal
        this.init();
    };

    magicImportFreeWidget.prototype = {

        init: function () {
            console.log('🪄 Magic Import Pro Widget initializing...');

            // Set up PDF.js worker if available
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    magicImportDocumentExtractor.pluginUrl + 'public/js/vendors/pdf.worker.min.js';
                console.log('📄 PDF.js worker configured');
            }

            this.detectFormFields();
            this.createModal();
            this.createCreditModal(); // Create credit modal on init
            this.setupEventListeners();
            this.addRequiredStyles();

            console.log('✅ Magic Import Pro Widget initialized');
        },



        /**
         * KEEP: Enhanced form field detection with WordPress form builder support
         */
        detectFormFields: function () {
            console.log('🔍 Starting enhanced form field detection...');
            var forms = document.querySelectorAll('form');
            var allFields = [];
            var fieldMappings = {};

            console.log('🔍 Found forms:', forms.length);

            forms.forEach(function (form, index) {
                var inputs = form.querySelectorAll('input[name], select[name], textarea[name]');
                console.log('🔍 Form', index, 'has', inputs.length, 'inputs');

                inputs.forEach(function (input) {
                    if (input.name && input.type !== 'submit' && input.type !== 'button' && input.type !== 'hidden') {
                        var fieldName = input.name;
                        var fieldLabel = this.getFieldLabel(input);
                        var fieldType = input.type || input.tagName.toLowerCase();
                        var existingField = allFields.find(function (f) { return f.fieldName === fieldName; });
                        var fieldInfo = existingField || {
                            fieldName: fieldName,
                            humanLabel: fieldLabel,
                            fieldType: fieldType,
                            placeholder: input.placeholder || '',
                            id: input.id || '',
                            options: []
                        };

                        fieldMappings[fieldName] = fieldLabel;

                        if (fieldInfo.humanLabel !== fieldLabel && fieldLabel) {
                            fieldInfo.humanLabel = fieldLabel;
                        }
                        if (!fieldInfo.placeholder && input.placeholder) {
                            fieldInfo.placeholder = input.placeholder;
                        }
                        if (!fieldInfo.id && input.id) {
                            fieldInfo.id = input.id;
                        }

                        if (input.tagName.toLowerCase() === 'select') {
                            fieldInfo.options = [];
                            input.querySelectorAll('option').forEach(function (opt) {
                                if (opt.value && opt.value !== '') {
                                    fieldInfo.options.push({
                                        value: opt.value,
                                        text: opt.textContent.trim()
                                    });
                                }
                            });
                        }

                        if (fieldType === 'checkbox' || fieldType === 'radio') {
                            if (!fieldInfo.optionType) {
                                fieldInfo.optionType = fieldType;
                            }

                            if (!Array.isArray(fieldInfo.options)) {
                                fieldInfo.options = [];
                            }

                            var optionLabel = (typeof this.getCheckboxOptionLabel === 'function')
                                ? this.getCheckboxOptionLabel(input)
                                : fieldLabel;
                            var optionValue = input.value || optionLabel || '';

                            optionLabel = (optionLabel || optionValue || '').trim();
                            optionValue = (optionValue || optionLabel).trim();

                            if (optionValue) {
                                var alreadyExists = fieldInfo.options.some(function (opt) {
                                    return opt.value === optionValue || opt.text === optionLabel;
                                });

                                if (!alreadyExists) {
                                    fieldInfo.options.push({
                                        value: optionValue,
                                        text: optionLabel || optionValue
                                    });
                                }
                            }
                        }

                        if (!existingField) {
                            allFields.push(fieldInfo);
                        }

                        console.log('📋 Field detected:', {
                            name: fieldName,
                            label: fieldInfo.humanLabel,
                            type: fieldInfo.fieldType,
                            hasOptions: Array.isArray(fieldInfo.options) && fieldInfo.options.length > 0
                        });
                    }
                }.bind(this));
            }.bind(this));

            this.detectedFields = allFields.map(f => f.fieldName);
            this.fieldMappings = fieldMappings;
            this.fieldInfo = allFields; // Full field info for enhanced mapping

            console.log('📋 Final detected fields:', this.detectedFields);
            console.log('🏷️ Field mappings:', this.fieldMappings);

            return allFields;
        },

        /**
         * KEEP: WordPress form builder label detection
         */
        getFieldLabel: function (input) {
            var label = '';

            // Method 1: Look for <label> tag with matching 'for' attribute
            if (input.id) {
                var labelElement = document.querySelector('label[for="' + input.id + '"]');
                if (labelElement && labelElement.textContent.trim()) {
                    label = labelElement.textContent.trim();
                }
            }

            // Method 2: Look for parent label
            if (!label) {
                var parentLabel = input.closest('label');
                if (parentLabel && parentLabel.textContent.trim()) {
                    var labelText = parentLabel.textContent.trim();
                    if (input.value) {
                        labelText = labelText.replace(input.value, '').trim();
                    }
                    label = labelText;
                }
            }

            // Method 3: Use placeholder
            if (!label && input.placeholder) {
                label = input.placeholder.trim();
            }

            // Method 4: Look for nearby text nodes
            if (!label) {
                var prevElement = input.previousElementSibling;
                if (prevElement && (prevElement.tagName === 'SPAN' || prevElement.tagName === 'DIV')) {
                    var text = prevElement.textContent.trim();
                    if (text && text.length > 0 && text.length < 50) {
                        label = text;
                    }
                }
            }

            // Method 5: WordPress form plugin patterns
            if (!label) {
                label = this.parseWordPressFormLabel(input);
            }

            // Clean up
            label = label.replace(/[\*\:]+$/g, '').trim();

            // Fallback
            if (!label) {
                label = this.generateLabelFromFieldName(input.name);
            }

            return label;
        },

        /**
         * KEEP: WordPress form plugin specific parsing
         */
        parseWordPressFormLabel: function (input) {
            var label = '';
            var fieldName = input.name;

            // WPForms pattern
            if (fieldName.includes('wpforms[fields]')) {
                var wpformsContainer = input.closest('.wpforms-field');
                if (wpformsContainer) {
                    var labelElement = wpformsContainer.querySelector('.wpforms-field-label');
                    if (labelElement) {
                        label = labelElement.textContent.trim();
                    }
                }
            }

            // Gravity Forms pattern
            else if (fieldName.includes('input_')) {
                var gfieldContainer = input.closest('.gfield');
                if (gfieldContainer) {
                    var labelElement = gfieldContainer.querySelector('.gfield_label');
                    if (labelElement) {
                        label = labelElement.textContent.trim();
                    }
                }
            }

            // Ninja Forms pattern
            else if (fieldName.includes('ninja_forms_field_')) {
                var ninjaContainer = input.closest('.nf-field-container');
                if (ninjaContainer) {
                    var labelElement = ninjaContainer.querySelector('.nf-field-label label');
                    if (labelElement) {
                        label = labelElement.textContent.trim();
                    }
                }
            }

            // Contact Form 7 pattern
            else if (fieldName.includes('your-')) {
                label = fieldName.replace('your-', '').replace(/-/g, ' ');
                label = label.charAt(0).toUpperCase() + label.slice(1);
            }

            return label;
        },

        /**
         * KEEP: Generate human-readable label from field name
         */
        generateLabelFromFieldName: function (fieldName) {
            var label = fieldName;
            label = label.replace(/^your-/, '');
            label = label.replace(/^user_/, '');
            label = label.replace(/^field_/, '');
            label = label.replace(/\[\d+\]$/, '');
            label = label.replace(/\[fields\]\[\d+\]$/, '');
            label = label.replace(/[_-]/g, ' ');
            label = label.replace(/\b\w/g, l => l.toUpperCase());
            return label;
        },

        /**
         * KEEP: Modal creation with existing styling
         */
        createModal: function () {
            if (document.querySelector('.magic-upload-modal')) return;

            var modal = document.createElement('div');
            modal.className = 'magic-upload-modal';
            modal.id = 'magicUploadModal';
            modal.innerHTML = this.buildModalContent();

            document.body.appendChild(modal);
        },

        /**
         * KEEP: Modal content builder
         */
        buildModalContent: function () {
            var headerContent = `
                <div class="magic-modal-header">
                    <img src="${magicImportDocumentExtractor.pluginUrl}public/assets/images/magic-import-logo1.svg" 
                         alt="Magic Import" 
                         style="width: 100%; height: 120px; object-fit: contain; margin: -10px;">
                    <button class="magic-modal-close" id="magicModalClose">&times;</button>
                </div>
            `;

            // Only show detected fields in debug mode
            var fieldsHtml = this.debugMode ? this.buildDetectedFieldsSection() : '';
            var uploadHtml = this.buildUploadSection();

            var processingCopy = (magicImportDocumentExtractor.strings && magicImportDocumentExtractor.strings.processing)
                ? magicImportDocumentExtractor.strings.processing
                : 'Magic Import AI is securely mapping your form fields...';

            var bodyContent = `
                <div class="magic-modal-body">
                    ${fieldsHtml}
                    ${uploadHtml}
                    <div class="magic-processing" id="magicProcessing" style="display: none;">
                        <div class="magic-spinner">
                            <div class="magic-spinner-ring"></div>
                            <div class="magic-spinner-ring"></div>
                            <div class="magic-spinner-ring"></div>
                            <div class="magic-spinner-particles"></div>
                        </div>
                        <div class="magic-processing-text">${processingCopy}</div>
                        <div class="magic-processing-subtext">Analyzing document structure & mapping fields...</div>
                    </div>
                </div>
            `;

            return `
                <div class="magic-modal-content">
                    ${headerContent}
                    ${bodyContent}
                </div>
            `;
        },

        buildDetectedFieldsSection: function () {
            var fieldsHtml = this.detectedFields.length > 0
                ? this.detectedFields.map(field => `<span class="field-tag">${field}</span>`).join('')
                : '<span class="field-tag">No form fields detected</span>';

            return `
                <div class="magic-detected-fields">
                    <div class="magic-fields-title">📋 Detected Form Fields (${this.detectedFields.length})</div>
                    <div class="magic-fields-list" id="detectedFieldsList">
                        ${fieldsHtml}
                    </div>
                </div>
            `;
        },

        buildUploadSection: function () {
            var disclaimer = (magicImportDocumentExtractor.strings && magicImportDocumentExtractor.strings.uploadDisclaimer)
                ? magicImportDocumentExtractor.strings.uploadDisclaimer
                : 'Uploading sends this file to Magic Import for AI processing and deletion after extraction.';
            return `
                <div class="magic-upload-section">
                    <div class="magic-upload-area" id="magicUploadArea">
                        <div class="magic-upload-icon">📄</div>
                        <div class="magic-upload-text">
                            <strong>Drop your document here</strong> or click to browse
                        </div>
                    </div>
                    <input type="file" id="magicFileInput" style="display: none;">
                    <p class="magic-upload-disclaimer">${disclaimer}</p>
                </div>
            `;
        },

        /**
         * KEEP: Event listeners
         */
        setupEventListeners: function () {
            var self = this;

            $(document).on('click', '.magic-trigger-btn, #magicTriggerBtn', function (e) {
                e.preventDefault();
                console.log('🪄 Magic Import button clicked');
                self.handleButtonClick();
            });

            $(document).on('click', '#magicModalClose', function () {
                self.closeModal();
            });

            $(document).on('click', '.magic-upload-modal', function (e) {
                if (e.target === this) {
                    self.closeModal();
                }
            });

            $(document).on('click', '#magicUploadArea', function () {
                if (!self.isProcessing) {
                    document.getElementById('magicFileInput').click();
                }
            });

            $(document).on('change', '#magicFileInput', function (e) {
                if (e.target.files.length > 0) {
                    self.checkFileAndProcess(e.target.files[0]);
                }
            });

            $(document).on('dragover', '#magicUploadArea', function (e) {
                e.preventDefault();
                $(this).addClass('drag-over');
            });

            $(document).on('dragleave', '#magicUploadArea', function () {
                $(this).removeClass('drag-over');
            });

            $(document).on('drop', '#magicUploadArea', function (e) {
                e.preventDefault();
                $(this).removeClass('drag-over');

                if (!self.isProcessing && e.originalEvent.dataTransfer.files.length > 0) {
                    self.checkFileAndProcess(e.originalEvent.dataTransfer.files[0]);
                }
            });

            $(document).on('keydown', function (e) {
                if (e.key === 'Escape' && $('.magic-upload-modal').is(':visible')) {
                    self.closeModal();
                }
                if (e.key === 'Escape' && $('.magic-credit-modal').is(':visible')) {
                    self.closeCreditModal();
                }
            });

            // Credit confirmation modal handlers
            $(document).on('click', '.magic-credit-modal-close, .magic-credit-cancel', function () {
                self.closeCreditModal();
            });

            $(document).on('click', '.magic-credit-modal-backdrop', function () {
                self.closeCreditModal();
            });

            $(document).on('click', '.magic-credit-proceed', function () {
                console.log('🔘 Proceed button clicked');
                console.log('📁 Pending file:', self.pendingFile);
                console.log('💳 Pending credits:', self.pendingCredits);
                console.log('📄 Pending page count:', self.pendingPageCount);
                
                if (self.pendingFile) {
                    // Save references BEFORE closing modal (which clears them)
                    var fileToProcess = self.pendingFile;
                    var creditsToUse = self.pendingCredits;
                    var pageCount = self.pendingPageCount;
                    
                    self.closeCreditModal();
                    self.processFile(fileToProcess, creditsToUse, pageCount);
                } else {
                    console.error('❌ No pending file found!');
                    alert('Error: File information was lost. Please try uploading again.');
                    self.closeCreditModal();
                }
            });
        },

        handleButtonClick: function () {
            console.log('🪄 Magic Import button clicked');

            // Re-detect fields
            this.detectFormFields();

            // Check license status FIRST before anything else
            this.validateLicenseStatus(function(isValid, errorMessage) {
                if (!isValid) {
                    console.log('❌ License validation failed:', errorMessage);
                    this.showLicenseErrorModal(errorMessage);
                    return;
                }

                // All checks passed - show upload interface
                console.log('✅ Opening upload interface');
                this.openModal();
            }.bind(this));
        },

        openModal: function () {
            $('.magic-upload-modal').remove();
            this.createModal();
            $('.magic-upload-modal').css('display', 'flex');
            $('body').css('overflow', 'hidden');
        },

        closeModal: function () {
            $('.magic-upload-modal').hide();
            $('body').css('overflow', '');
            this.resetUploadArea();
        },

        resetUploadArea: function () {
            $('#magicUploadArea').removeClass('drag-over');
            $('#magicProcessing').hide();
            $('#magicUploadArea').show();
            $('#magicFileInput').val('');
            this.isProcessing = false;
        },

        /**
         * NEW: Check file size and PDF pages, then show confirmation or process directly
         */
        checkFileAndProcess: function (file) {
            var self = this;
            console.log('🔍 Checking file before processing:', file.name, file.size, 'bytes');

            // Validate file size limits
            var maxSize = this.getMaxFileSize(file.type);
            if (file.size > maxSize) {
                var maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
                alert(magicImportDocumentExtractor.strings.fileTooLarge.replace('{maxSize}', maxSizeMB));
                return;
            }

            // Show large file warning if over 3MB
            if (file.size > 3 * 1024 * 1024) {
                console.log('⚠️ Large file detected:', (file.size / 1024 / 1024).toFixed(2), 'MB');
                // Could show a non-blocking warning here
            }

            // Only check pages for PDFs
            if (file.type === 'application/pdf' && typeof pdfjsLib !== 'undefined') {
                this.showCheckingMessage();
                this.countPDFPages(file)
                    .then(function (pageCount) {
                        self.hideCheckingMessage();
                        console.log('📄 PDF has', pageCount, 'pages');
                        
                        var creditInfo = self.calculateCredits(pageCount);
                        console.log('💳 Credit calculation:', creditInfo);

                        // Show modal if more than 1 credit required
                        if (creditInfo.credits > 1) {
                            self.showCreditModal(pageCount, creditInfo, file);
                        } else {
                            // 1-page PDF - still pass page count for tracking
                            self.processFile(file, 1, pageCount);
                        }
                    })
                    .catch(function (error) {
                        console.warn('⚠️ Could not count PDF pages:', error);
                        self.hideCheckingMessage();
                        // Proceed anyway with 1 credit assumption, no page count
                        self.processFile(file, 1);
                    });
            } else {
                // Non-PDF files always use 1 credit, no page count
                this.processFile(file, 1);
            }
        },

        /**
         * Get maximum file size based on file type
         */
        getMaxFileSize: function (fileType) {
            if (!magicImportDocumentExtractor.maxFileSizes) {
                return 10 * 1024 * 1024; // Default 10MB
            }

            if (fileType === 'application/pdf') {
                return magicImportDocumentExtractor.maxFileSizes.pdf;
            } else if (fileType.startsWith('image/')) {
                return magicImportDocumentExtractor.maxFileSizes.image;
            } else if (fileType.includes('word') || fileType.includes('document')) {
                return magicImportDocumentExtractor.maxFileSizes.docx;
            } else {
                return magicImportDocumentExtractor.maxFileSizes.text;
            }
        },

        /**
         * Count pages in a PDF file using PDF.js
         */
        countPDFPages: function (file) {
            return new Promise(function (resolve, reject) {
                if (typeof pdfjsLib === 'undefined') {
                    console.warn('PDF.js not loaded');
                    resolve(1); // Fallback
                    return;
                }

                // Set worker source if not already set
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 
                        magicImportDocumentExtractor.pluginUrl + 'public/js/vendors/pdf.worker.min.js';
                }

                var fileReader = new FileReader();
                fileReader.onload = function (e) {
                    var typedArray = new Uint8Array(e.target.result);

                    pdfjsLib.getDocument(typedArray).promise
                        .then(function (pdf) {
                            resolve(pdf.numPages);
                        })
                        .catch(function (error) {
                            console.error('Error reading PDF:', error);
                            resolve(1); // Fallback to 1 page
                        });
                };

                fileReader.onerror = function () {
                    resolve(1); // Fallback
                };

                fileReader.readAsArrayBuffer(file);
            });
        },

        /**
         * Calculate credits based on page count using fair tiers
         */
        calculateCredits: function (pageCount) {
            if (!magicImportDocumentExtractor.creditTiers) {
                return { credits: 1, description: 'Document' };
            }

            for (var i = 0; i < magicImportDocumentExtractor.creditTiers.length; i++) {
                var tier = magicImportDocumentExtractor.creditTiers[i];
                if (pageCount <= tier.maxPages) {
                    return {
                        credits: tier.credits,
                        description: tier.description
                    };
                }
            }

            // Fallback for extremely large documents (>1000 pages)
            return {
                credits: Math.ceil(pageCount / 20), // 1 credit per 20 pages for massive docs
                description: 'Extremely large document'
            };
        },

        /**
         * Show "Checking document size..." message
         */
        showCheckingMessage: function () {
            var uploadArea = $('#magicUploadArea');
            if (uploadArea.length) {
                uploadArea.find('p').first().text(magicImportDocumentExtractor.strings.checkingPages || 'Checking document size...');
            }
        },

        /**
         * Hide checking message
         */
        hideCheckingMessage: function () {
            var uploadArea = $('#magicUploadArea');
            if (uploadArea.length) {
                uploadArea.find('p').first().text(magicImportDocumentExtractor.strings.dragDropText || 'Drag & drop your document here');
            }
        },

        /**
         * Show credit confirmation modal
         */
        showCreditModal: function (pageCount, creditInfo, file) {
            console.log('💳 Showing credit modal:', pageCount, 'pages,', creditInfo.credits, 'credits');
            console.log('📁 File object:', file);
            
            this.pendingFile = file;
            this.pendingCredits = creditInfo.credits;
            this.pendingPageCount = pageCount; // Store page count for usage tracking
            
            console.log('✅ Stored pending file:', this.pendingFile ? this.pendingFile.name : 'NULL');
            console.log('✅ Stored pending credits:', this.pendingCredits);
            console.log('✅ Stored pending page count:', this.pendingPageCount);

            // Create modal if it doesn't exist
            if (!$('.magic-credit-modal').length) {
                console.log('Creating credit modal...');
                this.createCreditModal();
            }

            // Get remaining credits from license status
            var remainingCredits = 50; // Default fallback
            if (magicImportDocumentExtractor && magicImportDocumentExtractor.licenseStatus && typeof magicImportDocumentExtractor.licenseStatus.remaining !== 'undefined') {
                remainingCredits = magicImportDocumentExtractor.licenseStatus.remaining;
                console.log('📊 Remaining credits from license:', remainingCredits);
            } else {
                console.warn('⚠️ License status not available, using default:', remainingCredits);
                console.log('License status object:', magicImportDocumentExtractor ? magicImportDocumentExtractor.licenseStatus : 'magicImportDocumentExtractor not defined');
            }

            // Update modal content
            var message = (magicImportDocumentExtractor.strings.largeDocumentMessage || 
                'This {pages}-page document will use {credits} document credits.')
                .replace('{pages}', pageCount)
                .replace('{credits}', creditInfo.credits);

            $('.magic-credit-message').text(message);

            var remainingText = (magicImportDocumentExtractor.strings.remainingCredits || 'You have {remaining} credits remaining.')
                .replace('{remaining}', remainingCredits);
            $('.magic-credit-remaining').text(remainingText);

            var proceedText = (magicImportDocumentExtractor.strings.proceedButton || 'Proceed ({credits} credits)')
                .replace('{credits}', creditInfo.credits);
            $('.magic-credit-proceed').text(proceedText);

            // Always allow proceeding – show warning but keep button enabled
            if (remainingCredits < creditInfo.credits && remainingCredits >= 0) {
                var insufficientText = (magicImportDocumentExtractor.strings.insufficientCredits || 
                    'Insufficient credits. This document requires {required} credits but you only have {available}.')
                    .replace('{required}', creditInfo.credits)
                    .replace('{available}', remainingCredits);
                $('.magic-credit-message').text(insufficientText + ' ' + (magicImportDocumentExtractor.strings.creditOverrideNotice || 'We will attempt the upload anyway.'));
            }

            $('.magic-credit-proceed').prop('disabled', false).removeClass('disabled');

            // Show modal with fadeIn
            console.log('✅ Showing modal to user');
            $('.magic-credit-modal').fadeIn(200);
        },

        /**
         * Close credit modal
         */
        closeCreditModal: function () {
            $('.magic-credit-modal').fadeOut(200);
            this.pendingFile = null;
            this.pendingCredits = 1;
            this.pendingPageCount = null;
        },

        /**
         * Create credit confirmation modal HTML
         */
        createCreditModal: function () {
            var modalHtml = `
                <div class="magic-credit-modal" style="display: none;">
                    <div class="magic-credit-modal-backdrop"></div>
                    <div class="magic-credit-modal-content">
                        <div class="magic-credit-modal-header">
                            <h3>${magicImportDocumentExtractor.strings.largeDocumentTitle || 'Large Document Detected'}</h3>
                            <button class="magic-credit-modal-close">&times;</button>
                        </div>
                        <div class="magic-credit-modal-body">
                            <div class="magic-credit-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2"/>
                                    <path d="M12 6v6l4 2" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <p class="magic-credit-message"></p>
                            <p class="magic-credit-remaining"></p>
                        </div>
                        <div class="magic-credit-modal-footer">
                            <button class="magic-credit-cancel">${magicImportDocumentExtractor.strings.cancelButton || 'Cancel'}</button>
                            <button class="magic-credit-proceed">${magicImportDocumentExtractor.strings.proceedButton || 'Proceed'}</button>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);
        },

        /**
         * NEW: Clean file processing - ALL extraction happens in PHP
         */
        processFile: function (file, creditsToUse, pageCount) {
            console.log('🪄 Processing file:', file.name, 'Credits:', creditsToUse || 1, 'Pages:', pageCount || 'N/A');
            var self = this;
            
            // Default to 1 credit if not specified
            if (typeof creditsToUse === 'undefined') {
                creditsToUse = 1;
            }

            // Require a configured license key before sending data to the API
            var licenseKey = (magicImportDocumentExtractor.licenseKey || '').trim();
            if (!licenseKey) {
                console.warn('⚠️ Magic Import Free license key missing. Configure it in the WordPress admin settings.');
                this.showError('Add your Magic Import license key in WordPress → Magic Import → Settings to enable uploads.');
                this.resetUploadArea();
                return;
            }

            // Re-detect fields before processing
            this.detectFormFields();
            console.log('📄 Fields for processing:', this.fieldInfo);

            // Show processing UI
            this.isProcessing = true;
            $('#magicUploadArea').hide();
            $('#magicProcessing').show();

            // Prepare enhanced field mapping
            var enhancedMapping = {
                fields: this.fieldInfo,
                formType: this.detectFormType(),
                formatRules: this.getFormatRules(),
                formId: this.currentFormId
            };

            console.log('📋 Enhanced field mapping:', enhancedMapping);

            var contextHints = this.buildContextHints();
            if (contextHints.context) {
                enhancedMapping.context = contextHints.context;
            }
            if (contextHints.instructions) {
                enhancedMapping.instructions = contextHints.instructions;
            }
            if (contextHints.tags && contextHints.tags.length) {
                enhancedMapping.contextTags = contextHints.tags;
            }
            enhancedMapping.hasEnhancedMapping = true;
            enhancedMapping.pageUrl = window.location.href;

            if (!magicImportDocumentExtractor.ajaxUrl || !magicImportDocumentExtractor.nonce) {
                console.error('⚠️ Missing WordPress AJAX configuration.');
                this.showError('Magic Import is not configured correctly on this site.');
                this.resetUploadArea();
                return;
            }

            var requestMeta = this.buildRequestMetadata('wp_magic_import_document_extractor');
            var formData = new FormData();
            formData.append('action', 'magic_import_document_extractor_process');
            formData.append('nonce', magicImportDocumentExtractor.nonce);
            formData.append('document', file, file.name);
            formData.append('field_mappings', JSON.stringify(enhancedMapping));
            formData.append('page_url', window.location.href);
            formData.append('form_id', this.currentFormId || this.getFormId());
            formData.append('credits_to_use', creditsToUse);
            if (pageCount) {
                formData.append('page_count', pageCount);
            }
            formData.append('request_meta', JSON.stringify(requestMeta));

            console.log('📤 Sending document to WordPress AJAX proxy...');

            $.ajax({
                url: magicImportDocumentExtractor.ajaxUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                timeout: 90000,
                success: function (response) {
                    if (!response || !response.success) {
                        var fallbackMessage = 'Processing failed. Please try again.';
                        if (response && response.data && response.data.message) {
                            fallbackMessage = response.data.message;
                        }
                        self.showError(fallbackMessage);
                        self.resetUploadArea();
                        return;
                    }

                    var apiResponse = response.data || {};

                    if (!apiResponse.success) {
                        var apiMessage = apiResponse.error || 'Processing failed';
                        if (apiResponse.requires_upgrade && apiResponse.upgrade_url) {
                            apiMessage += ' Upgrade here: ' + apiResponse.upgrade_url;
                        }
                        self.showError(apiMessage);
                        self.resetUploadArea();
                        return;
                    }

                    var payload = apiResponse.data || {};
                    var extractedFields = payload.extractedFields || {};
                    var blockedFields = payload.blockedFields || [];
                    var outboundBlocked = payload.outboundBlocked || [];

                    console.log('✅ Extracted fields:', extractedFields);
                    console.log('🔒 Blocked fields (inbound):', blockedFields);
                    console.log('🔒 Blocked items (outbound):', outboundBlocked);

                    self.proceedWithFieldPopulation(extractedFields, blockedFields, outboundBlocked, apiResponse);

                    if (apiResponse.license_info && apiResponse.license_info.usage) {
                        self.syncUsageWithWordPress(apiResponse.license_info);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('❌ WordPress AJAX error:', error, xhr && xhr.responseText);

                    var message = 'Upload failed: ' + (error || status);
                    if (xhr && xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message) {
                        message = xhr.responseJSON.data.message;
                    }

                    self.showError(message);
                    self.resetUploadArea();
                }
            });
        },

        highlightBlockedFields: function (blockedFields) {
            var self = this;

            blockedFields.forEach(function (semanticName) {
                console.log('Looking for field with semantic name:', semanticName);

                // Search through our fieldInfo to find which actual field matches this semantic name
                var matchedField = null;

                if (self.fieldInfo && self.fieldInfo.length > 0) {
                    self.fieldInfo.forEach(function (fieldData) {
                        var fieldName = fieldData.fieldName.toLowerCase();
                        var humanLabel = fieldData.humanLabel.toLowerCase();
                        var semantic = semanticName.toLowerCase();

                        // Check if field name or label contains the semantic name
                        if (fieldName.includes(semantic) ||
                            humanLabel.includes(semantic) ||
                            semantic.includes(fieldName.split('[').pop().split(']')[0])) {

                            matchedField = fieldData.fieldName;
                            console.log('Matched semantic "' + semanticName + '" to field:', matchedField);
                        }
                    });
                }

                // Try to find the field in the DOM
                var field = null;
                if (matchedField) {
                    field = document.querySelector('[name="' + matchedField + '"]');
                }

                // Fallback: try direct semantic name match
                if (!field) {
                    field = document.querySelector('[name="' + semanticName + '"]') ||
                        document.querySelector('[name*="' + semanticName + '"]');
                }

                if (field) {
                    field.classList.add('magic-pci-blocked');
                    field.value = '[PCI BLOCKED]';
                    field.disabled = true;
                    field.style.backgroundColor = '#fef3c7';
                    field.style.borderColor = '#f59e0b';
                    field.style.color = '#92400e';
                    field.style.fontWeight = '600';
                    field.style.textAlign = 'center';

                    console.log('✅ PCI blocked field highlighted:', field.name);
                } else {
                    console.log('❌ Could not find field for:', semanticName);
                }
            });
        },


        /**
         * Validate license status before allowing upload
         * Lite now relies on the API for enforcement, so we only ensure a key exists locally.
         */
        validateLicenseStatus: function (callback) {
            if (!magicImportDocumentExtractor || !magicImportDocumentExtractor.licenseKey) {
                var message = 'Add your Magic Import license key under Magic Import → License & Usage before uploading documents.';
                callback(false, message);
                return;
            }

            callback(true, null);
        },

        /**
         * Show license error modal
         */
        showLicenseErrorModal: function (errorMessage) {
            console.log('🚫 Showing license error modal:', errorMessage);

            $('.magic-upload-modal').remove();

            var modalHtml = `
        <div class="magic-upload-modal" style="display: flex !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; z-index: 999999 !important; background: rgba(0,0,0,0.5) !important;">
            <div class="magic-modal-content" style="background: white !important; margin: auto !important; padding: 0 !important; border-radius: 12px !important; max-width: 500px !important; width: 90% !important;">
                <div class="magic-modal-header" style="padding: 15px 20px !important; background: #0f172a !important; color: white !important; border-radius: 12px 12px 0 0 !important; position: relative !important;">
                    <img src="${magicImportDocumentExtractor.pluginUrl}public/assets/images/magic-import-logo1.svg" 
                         alt="Magic Import" 
                         style="width: 100%; height: 60px; object-fit: contain;">
                    <button class="magic-modal-close" onclick="jQuery('.magic-upload-modal').remove(); jQuery('body').css('overflow', '');" style="position: absolute !important; top: 10px !important; right: 10px !important; background: rgba(255,255,255,0.1) !important; border: none !important; color: white !important; width: 26px !important; height: 26px !important; border-radius: 50% !important; cursor: pointer !important; font-size: 18px !important;">×</button>
                </div>
                <div class="magic-modal-body" style="padding: 25px !important; display: block !important; background: white !important;">
                    <div style="text-align: center !important; padding: 20px !important; background: #fef2f2 !important; border: 1px solid #fecaca !important; border-radius: 8px !important; display: block !important;">
                        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                        <div style="font-size: 18px; font-weight: 600; color: #991b1b; margin-bottom: 12px;">License Issue</div>
                        <div style="color: #7f1d1d; margin-bottom: 20px; line-height: 1.6; font-size: 14px;">
                            ${errorMessage}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                            <a href="https://magicimport.ai/magic-import/account?tab=licenses" target="_blank" style="display: block; background: #dc2626; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">
                                Manage Subscription
                            </a>
                            <button onclick="jQuery('.magic-upload-modal').remove(); jQuery('body').css('overflow', '');" style="background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

            $('body').append(modalHtml);
            $('body').css('overflow', 'hidden');
        },

        showBlockedDataWarning: function (blockedFields, outboundBlocked) {
            var totalBlocked = blockedFields.length + (outboundBlocked ? outboundBlocked.length : 0);

            if (totalBlocked === 0) return;

            var outboundHtml = '';
            if (outboundBlocked && outboundBlocked.length > 0) {
                var items = outboundBlocked.map(function (item) {
                    return '<li>' + item.count + ' ' + item.message + '</li>';
                }).join('');

                outboundHtml = `
                    <div style="margin-bottom: 12px;">
                        <strong>Filtered from document before processing:</strong>
                        <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                            ${items}
                        </ul>
                    </div>
                `;
            }

            var inboundHtml = '';
            if (blockedFields.length > 0) {
                inboundHtml = `
                    <div>
                        <strong>Blocked from form population:</strong>
                        <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                            ${blockedFields.map(f => '<li>' + f + '</li>').join('')}
                        </ul>
                    </div>
                `;
            }

            var warningHtml = `
                <div class="magic-pci-warning" style="position: fixed; top: 80px; right: 20px; 
                            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                            border-left: 4px solid #f59e0b; color: #92400e;
                            padding: 15px 20px; border-radius: 8px; z-index: 1000001;
                            max-width: 380px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    <div style="font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">🔒</span>
                        PCI Compliance Protection
                    </div>
                    <div style="font-size: 13px; line-height: 1.5;">
                        ${outboundHtml}
                        ${inboundHtml}
                    </div>
                    <div style="font-size: 11px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1); opacity: 0.9;">
                        <strong>Security:</strong> Sensitive financial data is automatically filtered and never processed or stored.
                    </div>
                    <button onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #92400e; cursor: pointer; font-size: 18px; padding: 0; width: 20px; height: 20px;">×</button>
                </div>
            `;

            $('body').append(warningHtml);

            setTimeout(function () {
                $('.magic-pci-warning').fadeOut(300, function () { $(this).remove(); });
            }, 12000);
        },

        /**
         * NEW: Detect form type from field patterns
         */
        detectFormType: function () {
            const fieldNames = this.detectedFields.map(f => f.toLowerCase()).join(' ');

            if (fieldNames.includes('vehicle') || fieldNames.includes('vin') || fieldNames.includes('mileage')) {
                return 'vehicle_form';
            }
            if (fieldNames.includes('patient') || fieldNames.includes('medical') || fieldNames.includes('insurance')) {
                return 'medical_form';
            }
            if (fieldNames.includes('property') || fieldNames.includes('listing') || fieldNames.includes('square')) {
                return 'real_estate_form';
            }

            return 'contact_form';
        },

        /**
         * NEW: Get format rules for form type
         */
        getFormatRules: function () {
            const formType = this.detectFormType();

            const rules = {
                'contact_form': {
                    phoneFormat: 'XXX-XXX-XXXX',
                    dateFormat: 'YYYY-MM-DD',
                    currencyFormat: 'numbers_only'
                },
                'vehicle_form': {
                    phoneFormat: 'XXX-XXX-XXXX',
                    dateFormat: 'YYYY-MM-DD',
                    vinFormat: '17_characters_uppercase'
                },
                'medical_form': {
                    phoneFormat: 'XXX-XXX-XXXX',
                    dateFormat: 'MM/DD/YYYY',
                    ssnFormat: 'XXX-XX-XXXX'
                }
            };

            return rules[formType] || rules['contact_form'];
        },

        buildContextHints: function () {
            var hints = [];
            var instructions = [];
            var tags = [];

            var pageTitle = document.title ? document.title.trim() : '';
            if (pageTitle) {
                hints.push('Page: ' + this.cleanText(pageTitle));
            }

            var heading = document.querySelector('h1');
            if (heading && heading.textContent.trim()) {
                hints.push('Headline: ' + this.cleanText(heading.textContent));
            }

            var targetForm = document.querySelector('form');
            if (targetForm) {
                var formHeading = targetForm.querySelector('h2, h3, legend, .form-title, .wpforms-title, .gform_title');
                if (formHeading && formHeading.textContent.trim()) {
                    hints.push('Form: ' + this.cleanText(formHeading.textContent));
                }

                var formDesc = targetForm.querySelector('.form-description, .gform_description, .wpforms-description, .nf-form-description, .forminator-description');
                if (formDesc && formDesc.textContent.trim()) {
                    instructions.push(this.cleanText(formDesc.textContent));
                }

                var helperText = targetForm.querySelector('.description, .form-help, .help-text, .help-block, .forminator-row-description');
                if (helperText && helperText.textContent.trim()) {
                    instructions.push(this.cleanText(helperText.textContent));
                }

                var dataContext = targetForm.getAttribute('data-magic-import-context');
                if (dataContext) {
                    hints.push(this.cleanText(dataContext));
                }

                var dataInstructions = targetForm.getAttribute('data-magic-import-instructions');
                if (dataInstructions) {
                    instructions.push(this.cleanText(dataInstructions));
                }

                var dataTags = targetForm.getAttribute('data-magic-import-tags');
                if (dataTags) {
                    tags = dataTags.split(',').map(function (tag) {
                        return tag.trim();
                    }).filter(Boolean);
                }
            }

            var metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription && metaDescription.content) {
                hints.push('Meta: ' + this.cleanText(metaDescription.content));
            }

            var contextString = this.truncateText(hints.filter(Boolean).join(' | '), 600);
            var instructionsString = this.truncateText(instructions.filter(Boolean).join(' '), 600);

            return {
                context: contextString || null,
                instructions: instructionsString || null,
                tags: tags
            };
        },

        cleanText: function (value) {
            if (!value) return '';
            return value.replace(/\s+/g, ' ').trim();
        },

        truncateText: function (value, limit) {
            if (!value) return '';
            if (value.length <= limit) {
                return value;
            }
            return value.substring(0, Math.max(0, limit - 3)) + '...';
        },

        buildRequestMetadata: function (clientLabel) {
            var locale = document.documentElement.getAttribute('lang') ||
                document.documentElement.lang ||
                (navigator.language || '');

            if (!locale && magicImportDocumentExtractor.locale) {
                locale = magicImportDocumentExtractor.locale;
            }

            return {
                client: clientLabel,
                source: window.location.href,
                requestId: this.generateRequestId(),
                pluginVersion: magicImportDocumentExtractor.version || '1.0.0',
                locale: locale || 'en-US',
                userAgent: navigator.userAgent
            };
        },

        generateRequestId: function () {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return window.crypto.randomUUID();
            }

            return 'req_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        },

        /**
         * NEW: Get form ID for tracking
         */
        getFormId: function () {
            const form = $('form').first();
            return form.attr('id') || form.attr('class') || 'unknown_form';
        },

        populateFields: function (extractedData) {
            if (!extractedData || typeof extractedData !== 'object') {
                console.log('No extracted data to populate');
                return 0;
            }

            console.log('Starting field population with data:', extractedData);
            var fieldsPopulated = 0;
            var self = this;

            // Store original values and imported values
            if (!this.fieldHistory) {
                this.fieldHistory = {};
            }

            Object.keys(extractedData).forEach(function (fieldName) {
                var value = extractedData[fieldName];
                if (!value || value === null || value === '') {
                    return;
                }

                var field = self.findFieldByName(fieldName);

                if (!field && fieldName.indexOf('[]') === -1) {
                    field = self.findFieldByName(fieldName + '[]');
                }

                if (!field && fieldName.indexOf('[]') !== -1) {
                    field = self.findFieldByName(fieldName.replace(/\[\]/g, ''));
                }
                
                // For Forminator country fields, try select specifically
                if (!field && fieldName.includes('country')) {
                    field = document.querySelector('select[name*="country"]');
                    console.log('🌍 Looking for country select field:', field ? 'FOUND' : 'NOT FOUND');
                }

                if (field) {
                    if (field.type === 'file') {
                        console.warn('Skipping file input field during auto-fill:', fieldName);
                        return;
                    }
                    // Store original value before changing
                    var originalValue = field.value;

                    console.log('🔧 Processing field:', fieldName, 'Type:', field.tagName, field.type, 'Name:', field.name);

                    // ENHANCED: Handle different field types properly
                    if (self.isDatePickerField(field)) {
                        // DATE PICKER - Special handling for jQuery UI, Flatpickr, etc.
                        console.log('📅 Detected as date picker');
                        self.setDatePickerValue(field, value);
                    } else if (field.tagName.toLowerCase() === 'select') {
                        // DROPDOWN - Intelligent matching
                        console.log('📋 Detected as dropdown/select');
                        self.setDropdownValue(field, value);
                    } else if (field.type === 'checkbox') {
                        // CHECKBOX / MULTI-SELECT LISTS
                        var checkboxResult = self.setCheckboxGroupValues(field, value, fieldName);

                        if (checkboxResult.matched) {
                            field = checkboxResult.referenceField || field;
                        } else {
                            var shouldCheck = self.normalizeBooleanValue(value);
                            field.checked = shouldCheck;
                            if (shouldCheck) {
                                field.classList.add('magic-filled');
                            } else {
                                field.classList.remove('magic-filled');
                            }
                        }
                    } else if (field.type === 'radio') {
                        // RADIO BUTTONS - Only highlight the CHECKED radio
                        var radios = document.querySelectorAll('[name="' + fieldName + '"]');
                        var radioWasSet = false;
                        radios.forEach(function (radio) {
                            // Remove magic-filled from all radios first
                            radio.classList.remove('magic-filled');
                            
                            if (radio.value.toLowerCase() === value.toLowerCase()) {
                                radio.checked = true;
                                radio.classList.add('magic-filled'); // Only highlight the checked one
                                radioWasSet = true;
                            }
                        });
                        
                        // Don't add to field variable since we handled it above
                        if (radioWasSet) {
                            field = document.querySelector('[name="' + fieldName + '"]:checked');
                        }
                    } else if (field.type === 'range') {
                        // RANGE SLIDER - Need to clean and parse the number
                        var cleanValue = value.toString()
                            .replace(/,/g, '')  // Remove commas: "18,750" -> "18750"
                            .replace(/[^\d.]/g, '');  // Remove non-numeric (miles, $, etc): "18750 miles" -> "18750"
                        
                        var numValue = parseFloat(cleanValue);
                        
                        // Validate against min/max
                        var min = parseFloat(field.getAttribute('min')) || 0;
                        var max = parseFloat(field.getAttribute('max')) || 100;
                        
                        if (!isNaN(numValue)) {
                            numValue = Math.max(min, Math.min(max, numValue)); // Clamp to range
                            field.value = numValue;
                            field.classList.add('magic-filled');
                            console.log('Range slider cleaned:', value, '->', numValue);
                        } else {
                            console.warn('Could not parse range value:', value);
                        }
                    } else {
                        // DEFAULT: Text inputs, textareas, etc.
                        field.value = value;
                        field.classList.add('magic-filled');
                    }

                    // Store both values in history
                    self.fieldHistory[fieldName] = {
                        original: originalValue,
                        imported: value,
                        currentlyShowing: 'imported',
                        field: field
                    };

                    // Create revert button
                    self.addRevertButton(field, fieldName);

                    // Trigger all necessary events
                    self.triggerFieldEvents(field);

                    fieldsPopulated++;
                    console.log('Field populated:', fieldName, '=', value);
                }
            });

            console.log('Total fields populated:', fieldsPopulated);
            this.addFilledFieldStyles();
            return fieldsPopulated;
        },


        /**
         * NEW FUNCTION: Detect if field is a date picker
         */
        isDatePickerField: function (field) {
            // Check for common date picker indicators
            return field.classList.contains('hasDatepicker') ||
                field.classList.contains('forminator-datepicker') ||
                field.classList.contains('datepicker') ||
                field.classList.contains('wpforms-datepicker') ||
                field.classList.contains('gfield-datepicker') ||
                field.classList.contains('ninja-forms-field-datepicker') ||
                field.hasAttribute('data-format') ||
                field.type === 'date' ||
                (field.id && field.id.includes('datepicker')) ||
                (field.id && field.id.includes('picker')) ||
                (field.className && field.className.includes('picker'));
        },

        /**
         * NEW FUNCTION: Set date picker value with proper formatting and triggering
         */
        setDatePickerValue: function (field, value) {
            console.log('🗓️ Setting date picker value:', field.name, '=', value);

            // Parse the incoming date (could be YYYY-MM-DD, MM/DD/YYYY, etc.)
            var date = this.parseDateValue(value);
            if (!date) {
                console.warn('Could not parse date:', value);
                field.value = value; // Fall back to raw value
                return;
            }

            // Get the expected format from the field
            var expectedFormat = field.getAttribute('data-format') || 'mm/dd/yy';

            // Format the date according to the field's expected format
            var formattedDate = this.formatDateForPicker(date, expectedFormat);
            console.log('📅 Formatted date:', formattedDate, 'for format:', expectedFormat);

            // jQuery UI Datepicker handling (Forminator, WPForms, Gravity Forms, many others)
            if (typeof jQuery !== 'undefined' && typeof jQuery.fn.datepicker !== 'undefined' && jQuery(field).hasClass('hasDatepicker')) {
                try {
                    // Set using jQuery UI datepicker method
                    jQuery(field).datepicker('setDate', date);
                    console.log('✅ Set via jQuery UI datepicker');
                    return;
                } catch (e) {
                    console.warn('jQuery datepicker set failed, using direct value:', e);
                }
            }

            // Native browser date input (type="date")
            if (field.type === 'date') {
                // Native date inputs always use YYYY-MM-DD format
                field.value = this.formatDateForPicker(date, 'yy-mm-dd');
                console.log('✅ Set native date input');
                return;
            }

            // Flatpickr (modern date picker library)
            if (field._flatpickr) {
                field._flatpickr.setDate(date, true);
                console.log('✅ Set via Flatpickr');
                return;
            }

            // Pikaday (another popular library)
            if (field._pikaday) {
                field._pikaday.setDate(date);
                console.log('✅ Set via Pikaday');
                return;
            }

            // Fallback: direct value assignment
            field.value = formattedDate;
            console.log('✅ Set direct value');
        },

        /**
         * NEW FUNCTION: Parse various date formats into a JavaScript Date object
         */
        parseDateValue: function (value) {
            if (!value) return null;

            // Try parsing as ISO format (YYYY-MM-DD)
            var isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
            }

            // Try parsing as US format (MM/DD/YYYY or MM-DD-YYYY)
            var usMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (usMatch) {
                return new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
            }

            // Try parsing as European format (DD/MM/YYYY or DD-MM-YYYY)
            var euMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (euMatch && parseInt(euMatch[1]) > 12) { // If day is > 12, it's definitely DD/MM
                return new Date(parseInt(euMatch[3]), parseInt(euMatch[2]) - 1, parseInt(euMatch[1]));
            }

            // Try short year format (MM/DD/YY or DD/MM/YY)
            var shortYearMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/);
            if (shortYearMatch) {
                var year = parseInt(shortYearMatch[3]);
                // Assume 20xx for years 00-50, 19xx for 51-99
                year = year <= 50 ? 2000 + year : 1900 + year;
                // Try US format first
                return new Date(year, parseInt(shortYearMatch[1]) - 1, parseInt(shortYearMatch[2]));
            }

            // Fallback: try native Date parsing
            var date = new Date(value);
            return isNaN(date.getTime()) ? null : date;
        },

        /**
         * NEW FUNCTION: Format a Date object according to jQuery UI datepicker format strings
         * Supports: mm/dd/yy, dd/mm/yy, yy-mm-dd, m/d/y, etc.
         */
        formatDateForPicker: function (date, format) {
            if (!date || !format) return '';

            var day = date.getDate();
            var month = date.getMonth() + 1; // JavaScript months are 0-indexed
            var year = date.getFullYear();
            var shortYear = year.toString().substr(-2);

            // Pad with zeros for double-digit formats
            var dd = (day < 10 ? '0' : '') + day;
            var mm = (month < 10 ? '0' : '') + month;

            // Common format patterns
            var result = format
                .replace(/yyyy/gi, year)      // 4-digit year
                .replace(/yy/g, year)          // Can be 4-digit or 2-digit depending on context
                .replace(/y/g, shortYear)      // 2-digit year
                .replace(/mm/g, mm)            // 2-digit month
                .replace(/m/g, month)          // 1-digit month
                .replace(/dd/g, dd)            // 2-digit day
                .replace(/d/g, day);           // 1-digit day

            console.log('Date formatting:', date, '→', result, 'using format:', format);
            return result;
        },
        /**
         * ENHANCED FUNCTION: Set dropdown value with intelligent matching
         */
        setDropdownValue: function (field, value) {
            console.log('📋 Setting dropdown:', field.name, '=', value);
            console.log('📋 Available options:', Array.from(field.options).map(function(opt) { 
                return opt.text + ' (value: ' + opt.value + ')'; 
            }));

            var options = Array.from(field.options);
            var valueLower = value.toLowerCase().trim();

            // Try exact match first (value attribute)
            var exactMatch = options.find(function (opt) {
                return opt.value.toLowerCase() === valueLower;
            });
            if (exactMatch) {
                field.value = exactMatch.value;
                console.log('✅ Exact value match');
                return;
            }

            // Try exact match (option text)
            var textMatch = options.find(function (opt) {
                return opt.text.toLowerCase().trim() === valueLower;
            });
            if (textMatch) {
                field.value = textMatch.value;
                console.log('✅ Exact text match');
                return;
            }

            // ENHANCED: Try "contains" matching in BOTH directions
            // This handles "United States" matching "United States of America (USA)"
            var partialMatch = options.find(function (opt) {
                var optTextLower = opt.text.toLowerCase().trim();
                
                // Skip empty options
                if (!optTextLower || optTextLower.length === 0) {
                    return false;
                }
                
                // Option contains the search value (USA contains US)
                if (optTextLower.includes(valueLower)) {
                    return true;
                }
                
                // Search value contains the option (less common but possible)
                if (valueLower.includes(optTextLower)) {
                    return true;
                }
                
                // SPECIAL CASE: "United States" should match "United States of America (USA)"
                // Check if search value is a significant substring at the START of the option
                if (valueLower.length > 5 && optTextLower.startsWith(valueLower)) {
                    return true;
                }
                
                // Also check if they both start with the same words
                var searchWords = valueLower.split(/\s+/);
                var optWords = optTextLower.split(/\s+/);
                
                // If search is 2+ words and option starts with those exact words
                if (searchWords.length >= 2) {
                    var searchStart = searchWords.slice(0, 2).join(' ');
                    var optStart = optWords.slice(0, 2).join(' ');
                    if (searchStart === optStart) {
                        return true;
                    }
                }
                
                return false;
            });
            
            if (partialMatch) {
                field.value = partialMatch.value;
                console.log('✅ Partial match:', partialMatch.text);
                return;
            }

            // Try abbreviation matching (e.g., "CA" → "California", "US" → "United States")
            if (valueLower.length <= 3) {
                var abbrevMatch = options.find(function (opt) {
                    return opt.text.toLowerCase().startsWith(valueLower) ||
                        opt.value.toLowerCase() === valueLower;
                });
                if (abbrevMatch) {
                    field.value = abbrevMatch.value;
                    console.log('✅ Abbreviation match:', abbrevMatch.text);
                    return;
                }
            }

            console.warn('⚠️ No dropdown match found for:', value);
            console.warn('⚠️ Tried to match against:', options.map(function(opt) { return opt.text; }).join(', '));
            field.value = ''; // Reset to empty if no match
        },

        findFieldByName: function(fieldName) {
            if (!fieldName || typeof fieldName !== 'string') {
                return null;
            }

            var exact = document.getElementsByName(fieldName);
            if (exact && exact.length) {
                return exact[0];
            }

            if (fieldName.indexOf('[]') === -1) {
                exact = document.getElementsByName(fieldName + '[]');
                if (exact && exact.length) {
                    return exact[0];
                }
            } else {
                exact = document.getElementsByName(fieldName.replace(/\[\]/g, ''));
                if (exact && exact.length) {
                    return exact[0];
                }
            }

            var normalized = fieldName.toLowerCase();
            var candidates = document.querySelectorAll('input[name], select[name], textarea[name]');
            for (var i = 0; i < candidates.length; i++) {
                var candidate = candidates[i];
                if (!candidate.name) {
                    continue;
                }

                var candidateName = candidate.name.toLowerCase();
                if (candidateName === normalized) {
                    return candidate;
                }

                if (candidateName.indexOf(normalized) !== -1) {
                    return candidate;
                }
            }

            return null;
        },

        setCheckboxGroupValues: function(field, rawValue, fieldName) {
            var self = this;
            if (!field && !fieldName) {
                return { matched: false };
            }

            var targetName = field ? field.name : fieldName;

            var nodeList = document.getElementsByName(targetName);
            var checkboxes = Array.prototype.filter.call(nodeList || [], function(box) {
                return box && box.type === 'checkbox';
            });

            if ((!checkboxes || !checkboxes.length) && targetName.indexOf('[]') === -1) {
                nodeList = document.getElementsByName(targetName + '[]');
                checkboxes = Array.prototype.filter.call(nodeList || [], function(box) {
                    return box && box.type === 'checkbox';
                });
            }

            if (checkboxes.length <= 1) {
                return { matched: false };
            }

            var desiredValues = self.normalizeMultiValueInput(rawValue);
            if (!desiredValues.length) {
                return { matched: false };
            }

            console.log('☑️ Attempting checkbox mapping for', targetName, '=>', desiredValues);

            var matchedAny = false;
            var firstMatch = null;

            checkboxes.forEach(function(box) {
                var optionValue = (box.value || '').toString().trim().toLowerCase();
                var labelValue = self.getCheckboxOptionLabel(box).toLowerCase();

                var shouldCheck = desiredValues.some(function(val) {
                    if (!val) {
                        return false;
                    }

                    return self.tokensMatch(optionValue, val) || self.tokensMatch(labelValue, val);
                });

                if (shouldCheck) {
                    box.checked = true;
                    box.classList.add('magic-filled');
                    matchedAny = true;
                    if (!firstMatch) {
                        firstMatch = box;
                    }
                } else {
                    box.checked = false;
                    box.classList.remove('magic-filled');
                }

                self.triggerFieldEvents(box);
            });

            if (matchedAny) {
                console.log('✅ Checkbox mapping succeeded for', targetName);
                return { matched: true, referenceField: firstMatch };
            }

            console.warn('⚠️ Checkbox mapping did not find matches for', targetName, desiredValues);
            return { matched: false };
        },

        normalizeMultiValueInput: function(value) {
            if (value === null || typeof value === 'undefined') {
                return [];
            }

            var items = [];

            if (Array.isArray(value)) {
                items = value;
            } else if (typeof value === 'object') {
                items = Object.keys(value).map(function(key) { return value[key]; });
            } else if (typeof value === 'string') {
                var cleaned = this.stripListDecorators(value);
                items = cleaned.split(/[,;\n]/);
            } else {
                items = [value];
            }

            var normalized = items.map(function(item) {
                if (item === null || typeof item === 'undefined') {
                    return '';
                }

                var text = item.toString();
                text = text.replace(/[\u2022\-•]/g, '').trim();
                text = text.replace(/^and\s+/i, '');
                text = text.replace(/\s+/g, ' ');
                text = text.trim();
                text = text.toLowerCase();
                return text;
            }).filter(function(item) { return item.length > 0; });

            return normalized;
        },

        stripListDecorators: function(text) {
            if (typeof text !== 'string') {
                return '';
            }

            var cleaned = text.trim();
            if (cleaned.indexOf(':') !== -1) {
                var parts = cleaned.split(':');
                if (parts[0] && parts[0].split(/[,;]/).length === 1 && parts[0].length <= 40) {
                    cleaned = parts.slice(1).join(':');
                }
            }

            return cleaned.replace(/[\u2022•]/g, ' ').replace(/\s+/g, ' ').trim();
        },

        getCheckboxOptionLabel: function(field) {
            if (!field) {
                return '';
            }

            var labelText = '';

            if (field.id) {
                var labelElement = document.querySelector('label[for="' + field.id + '"]');
                if (labelElement && labelElement.textContent) {
                    labelText = labelElement.textContent;
                }
            }

            if (!labelText) {
                var wrappingLabel = field.closest('label');
                if (wrappingLabel && wrappingLabel.textContent) {
                    labelText = wrappingLabel.textContent;
                }
            }

            if (!labelText) {
                var container = field.closest('.gchoice, .gfield_checkbox, .nf-field-element, .wpforms-field-checkbox, .forminator-field, .magic-checkbox-option');
                if (container && container.textContent) {
                    labelText = container.textContent;
                }
            }

            return (labelText || '').replace(/\s+/g, ' ').trim();
        },

        tokensMatch: function(source, target) {
            if (!source || !target) {
                return false;
            }

            if (source === target) {
                return true;
            }

            if (source.length >= 3 && target.indexOf(source) !== -1) {
                return true;
            }

            if (target.length >= 3 && source.indexOf(target) !== -1) {
                return true;
            }

            return false;
        },

        normalizeBooleanValue: function(value) {
            if (typeof value === 'boolean') {
                return value;
            }

            if (value === null || typeof value === 'undefined') {
                return false;
            }

            var normalized = value.toString().trim().toLowerCase();
            return normalized === '1' || normalized === 'true' || normalized === 'yes';
        },

        /**
         * NEW FUNCTION: Trigger all necessary events for form validation and detection
         */
        triggerFieldEvents: function (field) {
            // Create and dispatch events that form builders listen for
            var events = ['input', 'change', 'blur', 'keyup'];

            events.forEach(function (eventType) {
                var event = new Event(eventType, { bubbles: true, cancelable: true });
                field.dispatchEvent(event);
            });

            // jQuery events (if jQuery is present)
            if (typeof jQuery !== 'undefined') {
                jQuery(field).trigger('change').trigger('input').trigger('blur');
            }

            // Special handling for WordPress form builders
            if (field.classList.contains('forminator-input')) {
                // Forminator-specific validation trigger
                jQuery(field).trigger('focusout');
            }

            if (field.classList.contains('wpforms-field-large')) {
                // WPForms-specific validation
                jQuery(field).trigger('wpformsFieldValidation');
            }
        },

        addRevertButton: function (field, fieldName) {
            var self = this;

            // Check if button already exists
            var existingBtn = document.querySelector('.magic-revert-btn[data-field="' + fieldName + '"]');
            if (existingBtn) {
                return;
            }

            // Find the appropriate container
            var container = field.closest('.wpforms-field') ||
                field.closest('.gfield') ||
                field.closest('.nf-field-container') ||
                field.closest('.ff-el-group') ||
                field.closest('.ff-el-input--content') ||
                field.closest('.forminator-field') ||
                field.closest('.forminator-row') ||
                field.closest('.frm_form_field') ||
                field.closest('.elementor-field-group') ||
                field.closest('.et_pb_contact_field') ||
                field.closest('.form-group') ||
                field.parentElement;

            if (container) {
                var currentPosition = window.getComputedStyle(container).position;
                if (currentPosition === 'static') {
                    container.style.position = 'relative';
                }
            }

            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'magic-revert-btn';
            button.innerHTML = '↺';
            button.setAttribute('data-field', fieldName);

            // Detect form type and position accordingly
            var formType = this.detectFormBuilderType(field);
            var rightPosition = this.getRevertButtonPosition(formType, field);

            button.style.position = 'absolute';
            button.style.right = rightPosition;
            button.style.top = '50%';
            button.style.transform = 'translateY(-50%)';
            button.style.zIndex = '10';

            var history = this.fieldHistory[fieldName];
            var hasOriginal = history && history.original && history.original !== '';

            button.title = hasOriginal ?
                'Toggle: Click to show original value' :
                'Click to clear imported value or revert to original if available';

            button.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.toggleFieldValue(fieldName);
            };

            if (container) {
                container.appendChild(button);
            }
        },

        detectFormBuilderType: function (field) {
            if (field.closest('.wpforms-field')) return 'wpforms';
            if (field.closest('.gfield')) return 'gravity';
            if (field.closest('.nf-field-container')) return 'ninja';
            if (field.closest('.ff-el-group') || field.closest('.ff-el-input--content')) return 'fluent';
            if (field.closest('.frm_form_field')) return 'formidable';
            if (field.closest('.forminator-field') || field.closest('.forminator-row')) return 'forminator';
            if (field.closest('.elementor-field-group')) return 'elementor';
            if (field.closest('.et_pb_contact_field')) return 'divi';
            if (field.name && field.name.includes('your-')) return 'contact7';
            return 'generic';
        },

        getRevertButtonPosition: function (formType, field) {
            switch (formType) {
                case 'wpforms':
                    return '12px';
                case 'gravity':
                    return '12px';
                case 'fluent':
                    return '12px';
                case 'forminator':
                    return '12px';
                case 'ninja':
                    return '12px';
                case 'formidable':
                    return '12px';
                case 'contact7':
                    return '10px';
                case 'elementor':
                    return '12px';
                case 'divi':
                    return '12px';
                default:
                    return '10px';
            }
        },
        toggleFieldValue: function (fieldName) {
            var history = this.fieldHistory[fieldName];
            if (!history) return;

            var field = history.field;

            if (history.currentlyShowing === 'imported') {
                // Show original
                field.value = history.original;
                field.classList.remove('magic-filled');
                field.classList.add('magic-reverted');
                history.currentlyShowing = 'original';
            } else {
                // Show imported
                field.value = history.imported;
                field.classList.remove('magic-reverted');
                field.classList.add('magic-filled');
                history.currentlyShowing = 'imported';
            }

            // Trigger change event
            var event = new Event('change', { bubbles: true });
            field.dispatchEvent(event);
        },

        /**
         * KEEP: Green background animation for filled fields
         */
        addFilledFieldStyles: function () {
            if (!document.querySelector('#magic-filled-styles')) {
                var styles = `
            <style id="magic-filled-styles">

            .magic-pci-blocked {
                background-color: #fef3c7 !important;
                border-color: #f59e0b !important;
                box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25) !important;
                color: #92400e !important;
                font-weight: 600 !important;
                text-align: center !important;
            }

            .magic-filled {
                background-color: #f0fdf4 !important;
                border-color: #22c55e !important;
                box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25) !important;
                animation: magic-fill 0.6s ease;
                transition: all 0.3s ease;
                padding-right: 45px !important;
            }
            
            .magic-reverted {
                background-color: #fef3c7 !important;
                border-color: #f59e0b !important;
                box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25) !important;
                padding-right: 45px !important;
            }
            
            @keyframes magic-fill {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }
            
            .magic-revert-btn {
                position: absolute !important;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 2px solid #22c55e;
                background: white;
                color: #22c55e;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                padding: 0;
                line-height: 1;
            }
            
            .magic-revert-btn:hover {
                border-color: #16a34a;
                background: #f0fdf4;
                transform: translateY(-50%) scale(1.15) !important;
                box-shadow: 0 3px 8px rgba(34, 197, 94, 0.3);
            }
            
            .magic-revert-btn.showing-original {
                border-color: #f59e0b;
                color: #f59e0b;
                background: #fef3c7;
            }
            
            .magic-revert-btn.showing-original:hover {
                border-color: #d97706;
                background: #fde68a;
            }
            
            /* Ensure containers are position relative */
            .wpforms-field,
            .gfield,
            .nf-field-container,
            .ff-el-group,
            .ff-el-input--content,
            .frm_form_field,
            .form-group {
                position: relative !important;
            }
            
            /* Handle textarea specifically */
            textarea.magic-filled,
            textarea.magic-reverted {
                padding-right: 45px !important;
            }
            </style>
        `;
                document.head.insertAdjacentHTML('beforeend', styles);
            }
        },

        /**
         * KEEP: Success results banner
         */
        showPersistentResults: function (results) {
            var banner = $('<div></div>').css({
                'position': 'fixed',
                'top': '20px',
                'right': '20px',
                'background': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                'color': 'white',
                'padding': '20px 25px',
                'border-radius': '12px',
                'z-index': '1000001',
                'font-size': '14px',
                'box-shadow': '0 8px 25px rgba(34, 197, 94, 0.3)',
                'max-width': '420px',
                'min-width': '320px'
            });

            var confidence = Math.round((results.confidence || 0.7) * 100);

            var pciWarningHtml = '';
            if (results.outboundBlockedCount > 0) {
                pciWarningHtml = `
            <div style="background: rgba(252, 211, 77, 0.95); color: #78716c; padding: 12px; border-radius: 6px; margin: 12px 0 0 0; font-size: 12px; line-height: 1.4; border: 1px solid #fbbf24;">
                <div style="font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    <span>🔒</span> PCI Protection Active
                </div>
                <div style="font-size: 11px;">
                    ${results.outboundBlockedCount} sensitive item(s) filtered before processing (credit cards, SSNs)
                </div>
            </div>
        `;
            }

            banner.html(`
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="font-size: 24px;">✅</div>
            <div style="font-weight: 600; font-size: 16px;">Import Complete!</div>
        </div>
        <div style="margin-bottom: 8px;">
            <strong>${results.fieldsPopulated} fields</strong> populated from ${results.documentType}
        </div>
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">
            Processing: ${results.processingMethod} • Confidence: ${confidence}%
        </div>
        ${pciWarningHtml}
        <button class="close-results-btn" style="
            background: rgba(255,255,255,0.2); 
            border: 1px solid rgba(255,255,255,0.3); 
            color: white; 
            padding: 8px 16px; 
            border-radius: 6px; 
            cursor: pointer;
            font-size: 12px;
            margin-top: 12px;
            float: right;
        ">OK</button>
        <div style="clear: both;"></div>
    `);

            banner.find('.close-results-btn').on('click', function () {
                banner.fadeOut(300, function () {
                    banner.remove();
                });
            });

            $('body').append(banner);

            setTimeout(function () {
                banner.fadeOut(300, function () {
                    banner.remove();
                });
            }, 12000);
        },
        /**
         * KEEP: All existing styles
         */
        addRequiredStyles: function () {
            if (!document.querySelector('#magic-import-styles')) {
                var styles = `
                    <style id="magic-import-styles">



                    .magic-upload-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 999999;
                        display: none;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0, 0, 0, 0.5);
                        backdrop-filter: blur(4px);
                    }
                    
                    .magic-modal-content {
                        background: white;
                        border-radius: 15px;
                        max-width: 600px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                        position: relative;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    }
                    
                    .magic-modal-header {
                        padding: 0px;
                        border-bottom: 1px solid #334155;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #0f172a;
                        color: white;
                        border-radius: 15px 15px 0 0;
                        min-height: 80px;
                        position: relative;
                    }
                    
                    .magic-modal-close {
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: rgba(255,255,255,0.1);
                        border: none;
                        color: white;
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        transition: background 0.3s ease;
                    }
                    
                    .magic-modal-close:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }
                    
                    .magic-modal-body {
                        padding: 30px;
                    }
                    
                    .magic-setup-required {
                        text-align: center;
                        padding: 20px;
                    }
                    
                    .magic-setup-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                    }
                    
                    .magic-setup-title {
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 10px;
                        color: #333;
                    }
                    
                    .magic-setup-text {
                        color: #666;
                        margin-bottom: 20px;
                        line-height: 1.5;
                    }
                    
                    .magic-limit-notice {
                        text-align: center;
                        padding: 20px;
                        background: #fef3c7;
                        border: 1px solid #f59e0b;
                        border-radius: 8px;
                    }
                    
                    .magic-limit-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                        display: block;
                    }
                    
                    .magic-limit-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: #92400e;
                        margin-bottom: 10px;
                    }
                    
                    .magic-limit-text {
                        color: #b45309;
                        margin-bottom: 20px;
                        line-height: 1.5;
                    }
                    
                    .magic-limit-actions {
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                        flex-wrap: wrap;
                    }
                    
                    .magic-action-btn {
                        background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        text-decoration: none;
                        display: inline-block;
                        transition: all 0.2s ease;
                    }
                    
                    .magic-action-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
                        color: white;
                        text-decoration: none;
                    }
                    
                    .magic-action-btn.secondary {
                        background: transparent;
                        color: #14b8a6;
                        border: 2px solid #14b8a6;
                    }
                    
                    .magic-action-btn.secondary:hover {
                        background: #14b8a6;
                        color: white;
                    }
                    
                    .magic-detected-fields {
                        margin-bottom: 25px;
                        padding: 15px;
                        background: linear-gradient(135deg, #ecfeff 0%, #f0f9ff 100%);
                        border-radius: 8px;
                        border-left: 4px solid #14b8a6;
                    }
                    
                    .magic-fields-title {
                        font-weight: 600;
                        color: #333;
                        margin-bottom: 10px;
                        font-size: 14px;
                    }
                    
                    .magic-fields-list {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                    }
                    
                    .field-tag {
                        background: linear-gradient(135deg, #14b8a6 0%, #22c55e 100%);
                        color: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 500;
                    }
                    
                    .magic-upload-area {
                        border: 2px dashed #ddd;
                        border-radius: 8px;
                        padding: 30px 20px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    
                    .magic-upload-area:hover, .magic-upload-area.drag-over {
                        border-color: #14b8a6;
                        background: #f0fdfa;
                    }
                    
                    .magic-upload-icon {
                        font-size: 40px;
                        margin-bottom: 10px;
                    }
                    
                    .magic-upload-text {
                        margin-bottom: 0px;
                        font-size: 15px;
                    }
                    
                    .magic-upload-info {
                        font-size: 12px;
                        color: #666;
                        line-height: 1.4;
                    }
                    
                    .magic-processing {
                        text-align: center;
                        padding: 40px 20px;
                    }
                    
                    .magic-spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #14b8a6;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 15px;
                    }
                    
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    @keyframes slideInRight {
                        from { 
                            transform: translateX(100px);
                            opacity: 0;
                        }
                        to { 
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .magic-modal-content {
                            margin: 20px;
                            width: calc(100% - 40px);
                        }
                        
                        .magic-modal-body {
                            padding: 20px;
                        }
                        
                        .magic-limit-actions {
                            flex-direction: column;
                        }
                    }
                        .magic-revert-btn {
                        position: absolute;
                        right: -35px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        border: 2px solid #94a3b8;
                        background: white;
                        color: #64748b;
                        cursor: pointer;
                        font-size: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                        z-index: 10;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }

                    .magic-revert-btn:hover {
                        border-color: #3b82f6;
                        color: #3b82f6;
                        background: #eff6ff;
                        transform: translateY(-50%) scale(1.1);
                    }

                    .magic-filled + .magic-revert-btn {
                        border-color: #22c55e;
                        color: #22c55e;
                    }

                    .magic-reverted {
                        background-color: #fef3c7 !important;
                        border-color: #f59e0b !important;
                        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25) !important;
                    }

                    /* Make field containers position relative for button positioning */
                    input[name].magic-filled,
                    textarea[name].magic-filled,
                    select[name].magic-filled {
                        position: relative;
                    }
                    </style>
                `;
                document.head.insertAdjacentHTML('beforeend', styles);
            }
        },

        showError: function (message) {
            this.showToast('❌ ' + message, 'error');
        },

        /**
         * NEW: Extract field population logic into separate method
         */
        proceedWithFieldPopulation: function(extractedFields, blockedFields, outboundBlocked, response) {
            var fieldsPopulated = this.populateFields(extractedFields);

            // Show warnings for ANY blocked data (outbound or inbound)
            if (blockedFields.length > 0 || outboundBlocked.length > 0) {
                this.highlightBlockedFields(blockedFields);
            }

            if (fieldsPopulated > 0 || outboundBlocked.length > 0) {
                this.showPersistentResults({
                    fieldsPopulated: fieldsPopulated,
                    blockedCount: blockedFields.length,
                    outboundBlockedCount: outboundBlocked.length,
                    processingMethod: response.data.modelUsed || response.data.processingMethod || 'AI Processing',
                    confidence: response.data.confidence || 0.7,
                    documentType: response.data.documentType || 'Document'
                });

                setTimeout(function () {
                    this.closeModal();
                }.bind(this), 2000);
            } else {
                this.showToast('Document processed but no matching fields found', 'info');
                setTimeout(function () {
                    this.closeModal();
                }.bind(this), 3000);
            }
        },

        /**
         * NEW: Show DLP info badge (non-blocking, informational only)
         */
        showDLPInfoBadge: function(dlpData) {
            var riskSummary = [];
            if (dlpData.highRiskCount > 0) riskSummary.push(`${dlpData.highRiskCount} high-risk`);
            if (dlpData.mediumRiskCount > 0) riskSummary.push(`${dlpData.mediumRiskCount} medium-risk`);
            if (dlpData.lowRiskCount > 0) riskSummary.push(`${dlpData.lowRiskCount} low-risk`);
            
            var badgeColor = dlpData.highRiskCount > 0 ? '#ef4444' : 
                           dlpData.mediumRiskCount > 0 ? '#f59e0b' : '#3b82f6';
            var badgeIcon = dlpData.highRiskCount > 0 ? '🔴' : 
                          dlpData.mediumRiskCount > 0 ? '🟡' : 'ℹ️';
            
            var badgeHtml = `
                <div class="magic-dlp-info-badge" style="
                    position: fixed; bottom: 80px; right: 20px; 
                    background: white; border: 2px solid ${badgeColor};
                    border-radius: 8px; padding: 12px 16px; z-index: 999998;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: slideInRight 0.3s ease; max-width: 320px;">
                    
                    <div style="display: flex; align-items: start; gap: 10px;">
                        <span style="font-size: 24px;">${badgeIcon}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #1f2937; font-size: 13px; margin-bottom: 4px;">
                                Privacy Scan Complete
                            </div>
                            <div style="font-size: 12px; color: #64748b; line-height: 1.4;">
                                Detected ${riskSummary.join(', ')} item(s).
                                ${dlpData.highRiskCount > 0 ? '<br><strong style="color: ' + badgeColor + ';">Check your admin logs for details.</strong>' : 'All logged for compliance.'}
                            </div>
                        </div>
                        <button onclick="this.closest('.magic-dlp-info-badge').remove()" 
                                style="background: none; border: none; color: #94a3b8; 
                                       cursor: pointer; font-size: 18px; padding: 0; 
                                       width: 20px; height: 20px; line-height: 1;">×</button>
                    </div>
                </div>
            `;

            $('body').append(badgeHtml);

            // Auto-remove after 8 seconds
            setTimeout(function() {
                $('.magic-dlp-info-badge').fadeOut(300, function() {
                    $(this).remove();
                });
            }, 8000);
        },

        /**
         * DEPRECATED: Show DLP warning modal - NOW UNUSED (logging only)
         */
        showDLPWarningModal: function(dlpData, onAcknowledge) {
            var self = this;
            
            // Build findings list
            var findingsList = dlpData.findings
                .filter(f => f.risk_level === 'HIGH' || f.risk_level === 'MEDIUM')
                .map(function(finding) {
                    var riskColor = finding.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b';
                    var riskIcon = finding.risk_level === 'HIGH' ? '🔴' : '🟡';
                    return `
                        <div style="padding: 8px; background: ${finding.risk_level === 'HIGH' ? '#fef2f2' : '#fffbeb'}; 
                                    border-left: 3px solid ${riskColor}; margin-bottom: 8px; border-radius: 4px;">
                            <div style="font-weight: 600; color: ${riskColor};">
                                ${riskIcon} ${finding.fieldLabel}
                            </div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                                ${finding.type.replace(/_/g, ' ')} detected (${finding.likelihood})
                            </div>
                        </div>
                    `;
                }).join('');

            var modalHtml = `
                <div class="magic-dlp-warning-modal" style="
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.7); z-index: 999999;
                    display: flex; align-items: center; justify-content: center;
                    animation: fadeIn 0.2s ease;">
                    
                    <div style="background: white; border-radius: 12px; max-width: 500px; 
                                width: 90%; max-height: 80vh; overflow-y: auto; padding: 24px;
                                box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                        
                        <div style="text-align: center; margin-bottom: 20px;">
                            <div style="font-size: 48px; margin-bottom: 8px;">⚠️</div>
                            <h2 style="margin: 0; font-size: 20px; color: #1f2937;">
                                Field Mapping Alert
                            </h2>
                        </div>

                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; 
                                    padding: 16px; margin-bottom: 20px;">
                            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                                <strong>⚠️ Field Mapping Warning:</strong> Sensitive data was detected but it's being 
                                mapped to fields that may not be designed for this type of information. 
                                Please review the mappings below carefully.
                            </p>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <div style="font-weight: 600; margin-bottom: 12px; color: #374151;">
                                Mismatched Field Mappings:
                            </div>
                            <div style="max-height: 200px; overflow-y: auto;">
                                ${findingsList}
                            </div>
                        </div>

                        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; 
                                    padding: 12px; margin-bottom: 20px;">
                            <div style="font-size: 13px; color: #92400e; line-height: 1.5;">
                                <strong>Why this matters:</strong><br>
                                • Generic fields (notes, comments) may not have proper encryption<br>
                                • This data could be visible in form logs or email notifications<br>
                                • Consider renaming form fields to match the data type
                            </div>
                        </div>

                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; 
                                    padding: 12px; margin-bottom: 20px;">
                            <div style="font-size: 13px; color: #166534; line-height: 1.5;">
                                ✓ Data is used only for form filling<br>
                                ✓ No data is stored on our servers<br>
                                ✓ Transmitted securely via HTTPS<br>
                                ✓ Compliant with data protection standards
                            </div>
                        </div>

                        <div style="display: flex; gap: 12px;">
                            <button class="magic-dlp-cancel" style="
                                flex: 1; padding: 12px; border: 2px solid #e5e7eb; 
                                background: white; color: #374151; border-radius: 6px;
                                font-weight: 600; cursor: pointer; font-size: 14px;">
                                Cancel
                            </button>
                            <button class="magic-dlp-acknowledge" style="
                                flex: 1; padding: 12px; border: none; 
                                background: #3b82f6; color: white; border-radius: 6px;
                                font-weight: 600; cursor: pointer; font-size: 14px;">
                                I Understand, Continue
                            </button>
                        </div>

                    </div>
                </div>
            `;

            $('body').append(modalHtml);

            // Handle acknowledge button
            $('.magic-dlp-acknowledge').on('click', function() {
                $('.magic-dlp-warning-modal').fadeOut(200, function() {
                    $(this).remove();
                });
                
                // Send acknowledgment to server
                self.sendPIIAcknowledgment(dlpData);
                
                // Proceed with field population
                onAcknowledge();
            });

            // Handle cancel button
            $('.magic-dlp-cancel').on('click', function() {
                $('.magic-dlp-warning-modal').fadeOut(200, function() {
                    $(this).remove();
                });
                self.showToast('Upload cancelled', 'info');
                self.resetUploadArea();
            });
        },

        /**
         * NEW: Show DLP badge for low-risk detections (non-blocking)
         */
        showDLPBadge: function(dlpData) {
            var badgeHtml = `
                <div class="magic-dlp-badge" style="
                    position: fixed; bottom: 80px; right: 20px; 
                    background: #eff6ff; border: 2px solid #3b82f6;
                    border-radius: 8px; padding: 12px 16px; z-index: 999998;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    animation: slideInRight 0.3s ease;">
                    
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">ℹ️</span>
                        <div>
                            <div style="font-weight: 600; color: #1e40af; font-size: 13px;">
                                Privacy Scan Complete
                            </div>
                            <div style="font-size: 12px; color: #64748b;">
                                ${dlpData.totalCount} item(s) detected • No high-risk data
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(badgeHtml);

            // Auto-remove after 5 seconds
            setTimeout(function() {
                $('.magic-dlp-badge').fadeOut(300, function() {
                    $(this).remove();
                });
            }, 5000);
        },

        /**
         * NEW: Send PII acknowledgment to server for compliance tracking
         */
        sendPIIAcknowledgment: function(dlpData) {
            var wordpressUserId = null;
            if (typeof window.magicImportCurrentUser !== 'undefined') {
                wordpressUserId = window.magicImportCurrentUser.id || null;
            }

            var acknowledgmentData = {
                licenseKey: magicImportDocumentExtractor.licenseKey || 'free_tier',
                wordpressUserId: wordpressUserId,
                dlpData: {
                    highRiskCount: dlpData.highRiskCount,
                    mediumRiskCount: dlpData.mediumRiskCount,
                    lowRiskCount: dlpData.lowRiskCount,
                    totalCount: dlpData.totalCount,
                    highRiskFields: dlpData.highRiskFields,
                    mediumRiskFields: dlpData.mediumRiskFields
                },
                timestamp: new Date().toISOString()
            };

            console.log('📝 Sending PII acknowledgment:', acknowledgmentData);

            $.ajax({
                url: magicImportDocumentExtractor.apiEndpoint + '/api/magic-import/acknowledge-pii',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(acknowledgmentData),
                success: function(response) {
                    console.log('✅ PII acknowledgment recorded:', response);
                },
                error: function(xhr, status, error) {
                    console.warn('⚠️ PII acknowledgment failed (non-critical):', error);
                }
            });
        },

        /**
         * NEW: Sync refreshed usage numbers back to WordPress so the admin UI stays accurate
         */
        syncUsageWithWordPress: function(licenseInfo) {
            if (!licenseInfo || !licenseInfo.usage || typeof magicImportDocumentExtractor === 'undefined') {
                return;
            }

            if (!magicImportDocumentExtractor.licenseStatus) {
                magicImportDocumentExtractor.licenseStatus = {};
            }

            magicImportDocumentExtractor.licenseStatus.remaining = licenseInfo.usage.remaining;
            magicImportDocumentExtractor.licenseStatus.current_usage = licenseInfo.usage.current_usage;

            if (!magicImportDocumentExtractor.ajaxUrl || !magicImportDocumentExtractor.nonce) {
                console.warn('⚠️ Missing ajaxUrl or nonce, skipping usage sync.');
                return;
            }

            $.ajax({
                url: magicImportDocumentExtractor.ajaxUrl,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'agic_import_document_extractor_sync_usage',
                    nonce: magicImportDocumentExtractor.nonce,
                    remaining: licenseInfo.usage.remaining,
                    current_usage: licenseInfo.usage.current_usage,
                    credits_used: licenseInfo.usage.credits_used_for_this_document || 0,
                    tier: licenseInfo.tier || '',
                    subscription_status: licenseInfo.subscription_status || ''
                },
                success: function(res) {
                    if (!res || !res.success) {
                        console.warn('⚠️ Usage sync failed:', res);
                    } else {
                        console.log('✅ Usage sync complete:', res);
                    }
                },
                error: function(xhr, status, error) {
                    console.warn('⚠️ Usage sync AJAX error:', error);
                }
            });
        },

        showToast: function (message, type) {
            var toast = $('<div></div>').css({
                'position': 'fixed',
                'top': '20px',
                'right': '20px',
                'background': type === 'success' ? '#22c55e' : type === 'info' ? '#0891b2' : '#ef4444',
                'color': 'white',
                'padding': '12px 20px',
                'border-radius': '6px',
                'z-index': '1000000',
                'font-size': '14px',
                'box-shadow': '0 4px 15px rgba(0,0,0,0.2)',
                'max-width': '350px'
            }).text(message);

            $('body').append(toast);

            setTimeout(function () {
                toast.fadeOut(function () {
                    toast.remove();
                });
            }, 4000);
        }
    };

    $(document).ready(function () {
        console.log('🪄 Starting Magic Import Pro Widget...');

        if (typeof window.magicImportDocumentExtractor === 'undefined') {
            console.warn('⚠️ magicImportDocumentExtractor settings not found. Skipping widget initialization.');
            return;
        }

        window.magicImportWidget = new magicImportFreeWidget();
    });

})(jQuery);
