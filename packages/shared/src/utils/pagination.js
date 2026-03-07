"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = void 0;
exports.getPagination = getPagination;
exports.createPaginationInfo = createPaginationInfo;
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
function getPagination(options) {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(exports.MAX_PAGE_SIZE, Math.max(1, options.pageSize || exports.DEFAULT_PAGE_SIZE));
    return {
        skip: (page - 1) * pageSize,
        take: pageSize,
        page,
        pageSize,
    };
}
function createPaginationInfo(page, pageSize, total) {
    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
    };
}
//# sourceMappingURL=pagination.js.map