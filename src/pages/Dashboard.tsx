import React from 'react'
import DashboardLayout from '../components/layouts/DashboardLayout'
import { Typography, Grid, Paper, Box } from '@mui/material'

const Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Total Products</Typography>
            <Typography variant="h3">-</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Total Users</Typography>
            <Typography variant="h3">-</Typography>
          </Paper>
        </Grid>
      </Grid>
    </DashboardLayout>
  )
}

export default Dashboard
