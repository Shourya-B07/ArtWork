import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Message } from 'primereact/message'
import { fetchArtworks } from './api'
import type { Artwork, ArtworkApiResponse } from './types'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<{ [id: number]: boolean }>({})
  const [totalPages, setTotalPages] = useState<number>(0)
  const [rowsToSelect, setRowsToSelect] = useState<string>('')
  const [isProcessingSelection, setIsProcessingSelection] = useState<boolean>(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)

  // Fetch artwork data
  const { data: apiResponse, isLoading, error } = useQuery<ArtworkApiResponse>({
    queryKey: ['artworks', currentPage],
    queryFn: () => fetchArtworks(currentPage),
    staleTime: 0,
    gcTime: 0,
  })

  // Extract data from API response
  const currentPageArtworks: Artwork[] = apiResponse?.data || []
  const paginationInfo = apiResponse?.pagination

  // Update total pages when we receive pagination data
  useEffect(() => {
    if (paginationInfo && paginationInfo.total_pages !== totalPages) {
      setTotalPages(paginationInfo.total_pages)
    }
  }, [paginationInfo, totalPages])

  const isArtworkSelected = (artworkId: number): boolean => {
    return selectedArtworkIds[artworkId] === true
  }

  const areAllCurrentPageArtworksSelected = (): boolean => {
    if (currentPageArtworks.length === 0) return false
    return currentPageArtworks.every(artwork => isArtworkSelected(artwork.id))
  }

  const getCurrentPageSelectedCount = (): number => {
    if (currentPageArtworks.length === 0) return 0
    return currentPageArtworks.filter(artwork => isArtworkSelected(artwork.id)).length
  }

  const getTotalSelectedArtworkCount = (): number => {
    return Object.values(selectedArtworkIds).filter(isSelected => isSelected).length
  }

  const toggleArtworkSelection = (artworkId: number): void => {
    const isCurrentlySelected = isArtworkSelected(artworkId)
    setSelectedArtworkIds(prevSelection => {
      const newSelection = {
        ...prevSelection,
        [artworkId]: !isCurrentlySelected
      }
      return newSelection
    })
  }

  const toggleAllCurrentPageArtworks = (): void => {
    const allCurrentlySelected = areAllCurrentPageArtworksSelected()
    const currentPageArtworkIds = currentPageArtworks.map(artwork => artwork.id)
    
    setSelectedArtworkIds(prevSelection => {
      const updatedSelection = { ...prevSelection }
      currentPageArtworkIds.forEach(artworkId => {
        updatedSelection[artworkId] = !allCurrentlySelected
      })
      return updatedSelection
    })
  }

  const clearAllSelections = (): void => {
    setSelectedArtworkIds({})
  }

  const performMultiPageSelection = async (numToSelect: number): Promise<void> => {
    let currentSelections = { ...selectedArtworkIds }
    let selectedCount = 0
    let pageToFetch = currentPage

    for (const artwork of currentPageArtworks) {
      if (selectedCount < numToSelect) {
        currentSelections[artwork.id] = true
        selectedCount++
      } else {
        break
      }
    }
    while (selectedCount < numToSelect && pageToFetch < totalPages) {
      pageToFetch++
      try {
        const pageData = await fetchArtworks(pageToFetch)
        for (const artwork of pageData.data) {
          if (selectedCount < numToSelect) {
            currentSelections[artwork.id] = true
            selectedCount++
          } else {
            break
          }
        }
      } catch (error) {
        console.error(`Error fetching page ${pageToFetch} for selection:`, error)
        break
      }
    }

    setSelectedArtworkIds(currentSelections)
  }

  const handleSelectRows = async (): Promise<void> => {
    const num = parseInt(rowsToSelect, 10)

    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid positive number of rows to select.')
      return
    }

    setIsProcessingSelection(true)
    try {
      await performMultiPageSelection(num)
      
    } finally {
      setIsProcessingSelection(false)
      setRowsToSelect('')
      setIsDropdownOpen(false)
    }
  }

  
  const goToFirstPage = (): void => {
    setCurrentPage(1)
  }

  const goToLastPage = (): void => {
    setCurrentPage(totalPages)
  }

  const goToPage = (pageNumber: number): void => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  const getVisiblePageNumbers = (): number[] => {
    const delta = 2 
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, -1)
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push(-1, totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }
  
  const formatDisplayValue = (value: string | number | null): string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A'
    }
    return String(value)
  }

  const truncateLongText = (text: string | null, maxLength: number = 50): string => {
    if (!text) return 'N/A'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
  
  const renderSelectAllCheckbox = (): React.JSX.Element => {
    const allSelected = areAllCurrentPageArtworksSelected()
    return (
      <input
        key={`select-all-${allSelected}-${currentPage}`}
        type="checkbox"
        checked={allSelected}
        onChange={toggleAllCurrentPageArtworks}
      />
    )
  }

  const renderRowCheckbox = (artwork: Artwork): React.JSX.Element => {
    const isSelected = isArtworkSelected(artwork.id)
    return (
      <input
        key={`checkbox-${artwork.id}-${isSelected}`}
        type="checkbox"
        checked={isSelected}
        onChange={() => toggleArtworkSelection(artwork.id)}
      />
    )
  }
  
  const renderTitleColumnHeader = (): React.JSX.Element => {
    return (
      <div className="title-column-header">
        <div 
          className="title-dropdown-trigger"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span className="dropdown-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
          <span>Title</span>
        </div>
        
        {isDropdownOpen && (
          <div className="dropdown-content">
            <input
              type="number"
              value={rowsToSelect}
              onChange={(e) => setRowsToSelect(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && !isProcessingSelection && rowsToSelect && parseInt(rowsToSelect) > 0) {
                  handleSelectRows()
                }
              }}
              placeholder="Enter value"
              className="dropdown-input"
              min="1"
              disabled={isLoading || isProcessingSelection}
            />
            <button
              onClick={handleSelectRows}
              className="dropdown-submit-button"
              disabled={isLoading || isProcessingSelection || !rowsToSelect || parseInt(rowsToSelect) <= 0}
            >
              Submit
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderArtworkTitle = (artwork: Artwork): React.JSX.Element => {
    return <span>{formatDisplayValue(artwork.title)}</span>
  }

  const renderPlaceOfOrigin = (artwork: Artwork): React.JSX.Element => {
    return <span>{formatDisplayValue(artwork.place_of_origin)}</span>
  }

  const renderArtistName = (artwork: Artwork): React.JSX.Element => {
    return <span>{formatDisplayValue(artwork.artist_display)}</span>
  }

  const renderInscriptions = (artwork: Artwork): React.JSX.Element => {
    return (
      <span title={artwork.inscriptions || ''}>
        {truncateLongText(artwork.inscriptions, 40)}
      </span>
    )
  }

  const renderStartDate = (artwork: Artwork): React.JSX.Element => {
    return <span>{formatDisplayValue(artwork.date_start)}</span>
  }

  const renderEndDate = (artwork: Artwork): React.JSX.Element => {
    return <span>{formatDisplayValue(artwork.date_end)}</span>
  }
  
  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return (
      <div className="app-container">
        <h1>Artwork Gallery</h1>
        <Message 
          severity="error" 
          text={`Failed to load artworks: ${errorMessage}`}
          className="error-message"
        />
      </div>
    )
  }

  if (!isLoading && currentPageArtworks.length === 0) {
    return (
      <div className="app-container">
        <h1>Artwork Gallery</h1>
        <Message 
          severity="info" 
          text="No artworks found for this page."
          className="info-message"
        />
      </div>
    )
  }
  
  const selectedCount = getTotalSelectedArtworkCount()
  const hasSelections = selectedCount > 0
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages
  const hasData = currentPageArtworks.length > 0

  if (isLoading || isProcessingSelection) {
    return (
      <div className="loading-overlay">
        <ProgressSpinner />
        <p>{isProcessingSelection ? 'Selecting rows...' : 'Loading artworks...'}</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="header-section">
        <h1>Artwork Gallery</h1>
      </div>
      
      <div className="selection-panel">
        <div className="selection-info">
          <span className="selection-text">
            Selected: {selectedCount} rows total
          </span>
          {hasData && (
            <span className="current-page-selection">
              ({getCurrentPageSelectedCount()} on this page)
            </span>
          )}
        </div>
        {hasSelections && (
          <button 
            className="clear-all-button"
            onClick={clearAllSelections}
            title="Clear all selections across all pages"
          >
            Clear All Selections
        </button>
        )}
      </div>
      
      <div className="table-container">
        <DataTable 
          value={currentPageArtworks} 
          className="full-width-table"
          key={`table-${currentPage}-${selectedCount}`}
        >
          <Column 
            header={renderSelectAllCheckbox}
            body={renderRowCheckbox}
            style={{ width: '50px' }}
          />
                <Column 
                  field="title" 
                  header={renderTitleColumnHeader}
                  body={renderArtworkTitle}
                />
          <Column 
            field="place_of_origin" 
            header="Place of Origin"
            body={renderPlaceOfOrigin}
          />
          <Column 
            field="artist_display" 
            header="Artist"
            body={renderArtistName}
          />
          <Column 
            field="inscriptions" 
            header="Inscriptions"
            body={renderInscriptions}
          />
          <Column 
            field="date_start" 
            header="Date Start"
            body={renderStartDate}
          />
          <Column 
            field="date_end" 
            header="Date End"
            body={renderEndDate}
          />
        </DataTable>
      </div>
      
      {hasData && totalPages > 1 && (
        <div className="advanced-pagination">
          <button 
            className="pagination-btn first-page"
            onClick={goToFirstPage}
            disabled={isFirstPage || isLoading || isProcessingSelection}
            title="Go to first page"
          >
            ««
          </button>
          
          <button 
            className="pagination-btn prev-page"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={isFirstPage || isLoading || isProcessingSelection}
            title="Go to previous page"
          >
            «
          </button>
          
          <div className="page-numbers">
            {getVisiblePageNumbers().map((pageNum, index) => (
              pageNum === -1 ? (
                <span key={`dots-${index}`} className="page-dots">...</span>
              ) : (
                  <button
                    key={pageNum}
                    className={`pagination-btn page-number ${pageNum === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(pageNum)}
                    disabled={isLoading || isProcessingSelection}
                    title={`Go to page ${pageNum}`}
                  >
                    {pageNum}
                  </button>
              )
            ))}
          </div>
          
          <button 
            className="pagination-btn next-page"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={isLastPage || isLoading || isProcessingSelection}
            title="Go to next page"
          >
            »
          </button>
          
          <button 
            className="pagination-btn last-page"
            onClick={goToLastPage}
            disabled={isLastPage || isLoading || isProcessingSelection}
            title="Go to last page"
          >
            »»
          </button>
        </div>
      )}
    </div>
  )
}

export default App
